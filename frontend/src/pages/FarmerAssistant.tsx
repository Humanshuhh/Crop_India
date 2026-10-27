import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  Camera,
  X,
  Bot,
  User as UserIcon,
  Sparkles,
  RotateCw,
  Volume2,
  Square,
  ArrowDown,
  AlertTriangle,
  ListOrdered,
  BookOpen,
  Plus,
  Search,
  Trash2,
  Copy,
  Check,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useVoice } from '../context/VoiceContext';
import { queryFarmerAssistant } from '../services/assistant';
import type { AssistantMessage, FarmerAssistantResult } from '../types/assistant.types';
import type { NormalizedError } from '../types/api.types';
import {
  useConversations,
  getConversationGroup,
  type ConversationGroupKey,
} from '../hooks/useConversations';

// Max file size: 10 MB
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Human-readable file size formatter
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Formatter for timer seconds
const formatSeconds = (sec: number): string => {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const FarmerAssistant: React.FC = () => {
  const { language, t } = useLanguage();
  const { isSpeaking, activeContentId, speak, stop } = useVoice();
  const location = useLocation();

  // Multi-conversation persistence hook
  const {
    conversations,
    activeId,
    activeConversation,
    createNewConversation,
    selectConversation,
    deleteConversation,
    appendMessage,
    replaceMessage,
  } = useConversations();

  // Active message history for current conversation
  const messages = activeConversation.messages;

  // Search in conversations
  const [searchQuery, setSearchQuery] = useState('');

  // UI State: Sidebar collapse (desktop) & Drawer (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Composer Transient State
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Voice Recording State
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Submission State scoped to conversation ID to prevent cross-chat loading flicker
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const isLoading = loadingConvId !== null && loadingConvId === activeId;
  const activeRequestIdRef = useRef<number>(0);
  const [requestError, setRequestError] = useState<NormalizedError | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Retry context: stores the last request so Retry can replay without creating duplicate user messages
  const lastRequestContextRef = useRef<{
    convId: string;
    query: string;
    language: string;
    imageFile: File | null;
    errorMsgId: string;
  } | null>(null);

  // Keep a ref to activeId to prevent late async responses from corrupting switched chats
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Ctrl+K shortcut — create new conversation (only when not typing in composer/search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        // Don't intercept when the user is typing in an input or textarea
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        handleNewConversationClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup audio on unmount or conversation change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [activeId]);

  // Reset scroll container on route change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Auto-scroll to bottom of messages when new messages arrive
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang =
        language === 'hi'
          ? 'hi-IN'
          : language === 'bn'
          ? 'bn-IN'
          : language === 'te'
          ? 'te-IN'
          : language === 'ta'
          ? 'ta-IN'
          : language === 'mr'
          ? 'mr-IN'
          : 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => {
          const updated = prev ? `${prev} ${transcript}` : transcript;
          return updated;
        });
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'aborted') {
          setMicNotice(
            event.error === 'not-allowed'
              ? 'Microphone permission was denied. Please allow microphone access in your browser.'
              : `Voice input error (${event.error}). Please try again or type.`
          );
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [language]);

  // Recording timer effect
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Voice recording triggers
  const handleToggleVoiceInput = () => {
    setMicNotice(null);
    if (isRecording) {
      handleStopVoiceInput();
    } else {
      if (!recognitionRef.current) {
        setMicNotice('Speech-to-text is not supported by your current browser. Please use Chrome/Edge or type your query.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('[Voice Input Error]', err);
        setMicNotice('Microphone access was denied or timed out. Please check browser permissions.');
        setIsRecording(false);
      }
    }
  };

  const handleStopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  };

  const handleCancelVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Image Selection & Validation
  const handleImageSelect = (file: File | undefined) => {
    if (!file) return;
    setImageError(null);

    // Validate type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      setImageError('Unsupported image format. Please select a JPEG, PNG, or WEBP photo.');
      return;
    }

    // Validate size (max 10MB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError(
        `Selected image (${formatFileSize(file.size)}) exceeds the 10MB limit. Please choose a smaller photo or compress it.`
      );
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageError(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Multiline Textarea auto-resize and change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && loadingConvId === null) {
        handleSendMessage();
      }
    }
  };

  // Copy assistant response
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  // Send message workflow
  const handleSendMessage = async (textToSend?: string) => {
    // Prevent duplicate concurrent requests
    if (loadingConvId !== null) return;

    const query = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!query && !selectedImage) return;

    // Capture the target conversation ID and request sequence at moment of sending
    const targetConvId = activeId;
    const reqSeq = ++activeRequestIdRef.current;

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: AssistantMessage = {
      id: userMessageId,
      sender: 'user',
      text: query,
      imageUrl: imagePreviewUrl || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Append to active conversation history
    appendMessage(targetConvId, newUserMessage);

    // Clear composer inputs
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const imageToSubmit = selectedImage;
    handleRemoveImage();
    setLoadingConvId(targetConvId);
    setRequestError(null);

    // Pre-allocate an error message ID so we can store it in retry context
    const errorMsgId = `err-${Date.now()}`;

    try {
      const result: FarmerAssistantResult = await queryFarmerAssistant({
        query_text: query,
        target_language: language,
        image_file: imageToSubmit || undefined,
      });

      // Ignore stale response if a newer request was dispatched
      if (activeRequestIdRef.current !== reqSeq) return;

      // Success: clear any pending retry context
      lastRequestContextRef.current = null;

      const assistantMsg: AssistantMessage = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        text: result.voiceAdvisory || result.text,
        spokenSummary: result.voiceAdvisory || result.text,
        audioBase64: result.audioBase64,
        voiceCommands: result.voiceCommands,
        actionIntent: result.actionIntent,
        detailedResponse: result.detailedResponse,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      // Append to the conversation it was originally sent from
      appendMessage(targetConvId, assistantMsg);
    } catch (err) {
      if (activeRequestIdRef.current !== reqSeq) return;

      const normErr = err as NormalizedError;
      setRequestError(normErr);

      const errorMsg: AssistantMessage = {
        id: errorMsgId,
        sender: 'assistant',
        text:
          normErr.userMessage ||
          'Assistant service temporarily unavailable. Please verify backend environment configuration.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        retryQuery: query,
        retryLanguage: language,
      };

      // Store retry context so handleRetry can replay this exact request
      lastRequestContextRef.current = {
        convId: targetConvId,
        query,
        language,
        imageFile: imageToSubmit,
        errorMsgId,
      };

      appendMessage(targetConvId, errorMsg);
    } finally {
      if (activeRequestIdRef.current === reqSeq) {
        setLoadingConvId(null);
      }
    }
  };

  // Retry a failed request: replaces the error message in-place without adding a duplicate user message
  const handleRetry = async (errorMsgId: string) => {
    // Prevent duplicate concurrent requests
    if (loadingConvId !== null) return;

    const ctx = lastRequestContextRef.current;
    if (!ctx || ctx.errorMsgId !== errorMsgId) return;

    const { convId, query, language: retryLang, imageFile } = ctx;
    const reqSeq = ++activeRequestIdRef.current;

    setLoadingConvId(convId);
    setRequestError(null);

    try {
      const result: FarmerAssistantResult = await queryFarmerAssistant({
        query_text: query,
        target_language: retryLang,
        image_file: imageFile || undefined,
      });

      if (activeRequestIdRef.current !== reqSeq) return;

      // Clear retry context on success
      lastRequestContextRef.current = null;

      const assistantMsg: AssistantMessage = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        text: result.voiceAdvisory || result.text,
        spokenSummary: result.voiceAdvisory || result.text,
        audioBase64: result.audioBase64,
        voiceCommands: result.voiceCommands,
        actionIntent: result.actionIntent,
        detailedResponse: result.detailedResponse,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      // Replace the error card with the successful assistant message
      replaceMessage(convId, errorMsgId, assistantMsg);
    } catch (err) {
      if (activeRequestIdRef.current !== reqSeq) return;

      const normErr = err as NormalizedError;
      setRequestError(normErr);

      // Replace error card with an updated error (same id, updated text/timestamp)
      const updatedErrorMsg: AssistantMessage = {
        id: errorMsgId,
        sender: 'assistant',
        text:
          normErr.userMessage ||
          'Assistant service temporarily unavailable. Please verify backend environment configuration.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        retryQuery: query,
        retryLanguage: retryLang,
      };

      // Update retry context with same errorMsgId so user can retry again
      lastRequestContextRef.current = { ...ctx };

      replaceMessage(convId, errorMsgId, updatedErrorMsg);
    } finally {
      if (activeRequestIdRef.current === reqSeq) {
        setLoadingConvId(null);
      }
    }
  };

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const titleMatch = c.title.toLowerCase().includes(q);
      const messageMatch = c.messages.some((m) => m.text.toLowerCase().includes(q));
      return titleMatch || messageMatch;
    });
  }, [conversations, searchQuery]);

  // Group conversations by date (Today, Yesterday, Previous 7 days, Older)
  const groupedConversations = useMemo(() => {
    const groups: Record<ConversationGroupKey, typeof filteredConversations> = {
      Today: [],
      Yesterday: [],
      'Previous 7 days': [],
      Older: [],
    };

    filteredConversations.forEach((conv) => {
      const groupKey = getConversationGroup(conv.updatedAt);
      groups[groupKey].push(conv);
    });

    return groups;
  }, [filteredConversations]);

  // New Conversation click handler
  const handleNewConversationClick = () => {
    createNewConversation();
    setInputText('');
    handleRemoveImage();
    setRequestError(null);
    setMobileDrawerOpen(false);
  };

  // Switch conversation
  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    setInputText('');
    handleRemoveImage();
    setRequestError(null);
    setMobileDrawerOpen(false);
  };

  // Suggested questions from translations
  const suggestedQuestions = [
    t('assistantSuggestedQuestion1'),
    t('assistantSuggestedQuestion2'),
    t('assistantSuggestedQuestion3'),
    t('assistantSuggestedQuestion4'),
  ];

  return (
    <div className="flex flex-1 h-full min-h-0 overflow-hidden bg-stone-50 w-full relative">
      {/* ========================================================= */}
        {/* LEFT SIDEBAR: Desktop Persistent / Collapsible            */}
        {/* ========================================================= */}
        <aside
          aria-label="Conversation History"
          className={`${
            sidebarOpen ? 'w-72 xl:w-80' : 'w-0'
          } hidden lg:flex flex-col h-full bg-stone-900 text-stone-200 border-r border-stone-800 transition-all duration-300 ease-in-out shrink-0 overflow-hidden select-none`}
        >
          <div className="p-3.5 space-y-3 shrink-0">
            {/* New Conversation Button */}
            <button
              type="button"
              onClick={handleNewConversationClick}
              className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-between shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>{t('assistantNewConversation')}</span>
              </span>
              <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded-md font-mono">
                Ctrl+K
              </span>
            </button>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('assistantSearchConversations')}
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-stone-800/90 border border-stone-700 text-stone-200 placeholder-stone-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4 min-h-0 text-xs">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-stone-400 space-y-1.5">
                <MessageSquare className="w-5 h-5 mx-auto text-stone-500 opacity-60" />
                <p className="font-medium text-stone-300">
                  {searchQuery ? t('assistantNoConversationsFound') : 'No saved conversations'}
                </p>
                {searchQuery && (
                  <p className="text-[11px] text-stone-500">
                    Try searching for another crop, fertilizer, or disease term.
                  </p>
                )}
              </div>
            ) : (
              (Object.keys(groupedConversations) as ConversationGroupKey[]).map((groupKey) => {
                const groupItems = groupedConversations[groupKey];
                if (groupItems.length === 0) return null;

                const localizedGroupLabel =
                  groupKey === 'Today'
                    ? t('assistantGroupToday')
                    : groupKey === 'Yesterday'
                    ? t('assistantGroupYesterday')
                    : groupKey === 'Previous 7 days'
                    ? t('assistantGroupPrevious7Days')
                    : t('assistantGroupOlder');

                return (
                  <div key={groupKey} className="space-y-1">
                    <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      {localizedGroupLabel}
                    </span>
                    <div className="space-y-0.5">
                      {groupItems.map((conv) => {
                        const isActive = conv.id === activeId;
                        const lastMessage = conv.messages[conv.messages.length - 1];
                        const rawPreview = lastMessage ? lastMessage.text.slice(0, 42) : '';
                        // Suppress preview when it duplicates the title (case-insensitive trim)
                        const titleNorm = (conv.title || '').trim().toLowerCase();
                        const previewNorm = rawPreview.trim().toLowerCase();
                        const showPreview = rawPreview && previewNorm !== titleNorm.slice(0, previewNorm.length);

                        return (
                          <div
                            key={conv.id}
                            className={`group relative rounded-xl transition-colors flex items-center justify-between ${
                              isActive
                                ? 'bg-stone-800 text-white font-medium border-l-2 border-emerald-500'
                                : 'text-stone-300 hover:bg-stone-800/60 hover:text-white'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectConversation(conv.id)}
                              className="w-full text-left py-2 px-2.5 pr-8 flex flex-col gap-0.5 min-w-0 focus:outline-none"
                            >
                              <span className="font-semibold text-xs truncate block text-stone-100">
                                {conv.title || 'New conversation'}
                              </span>
                              {showPreview && (
                                <span className="text-[11px] text-stone-400 truncate block">
                                  {rawPreview}
                                </span>
                              )}
                            </button>

                            {/* Delete Action Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                              className="absolute right-1.5 p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-700/60 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                              title={t('assistantDeleteChat')}
                              aria-label={t('assistantDeleteChat')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </aside>

        {/* ========================================================= */}
        {/* MOBILE DRAWER: Overlay on small viewports                 */}
        {/* ========================================================= */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Slide-in Drawer */}
            <div className="relative w-4/5 max-w-xs bg-stone-900 text-stone-200 h-full flex flex-col shadow-2xl z-10 animate-fadeIn">
              <div className="p-3.5 flex items-center justify-between border-b border-stone-800">
                <span className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span>Kisan Mitra Chats</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 focus:outline-none"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 space-y-3 shrink-0">
                {/* New Conversation Button */}
                <button
                  type="button"
                  onClick={handleNewConversationClick}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('assistantNewConversation')}</span>
                </button>

                {/* Mobile Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('assistantSearchConversations')}
                    className="w-full pl-8 pr-7 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 placeholder-stone-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Conversations Scroll Area */}
              <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4 min-h-0 text-xs">
                {filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-stone-400">
                    <p className="font-medium text-stone-300">
                      {searchQuery ? t('assistantNoConversationsFound') : 'No saved conversations'}
                    </p>
                  </div>
                ) : (
                  (Object.keys(groupedConversations) as ConversationGroupKey[]).map((groupKey) => {
                    const groupItems = groupedConversations[groupKey];
                    if (groupItems.length === 0) return null;

                    const localizedGroupLabel =
                      groupKey === 'Today'
                        ? t('assistantGroupToday')
                        : groupKey === 'Yesterday'
                        ? t('assistantGroupYesterday')
                        : groupKey === 'Previous 7 days'
                        ? t('assistantGroupPrevious7Days')
                        : t('assistantGroupOlder');

                    return (
                      <div key={groupKey} className="space-y-1">
                        <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          {localizedGroupLabel}
                        </span>
                        <div className="space-y-0.5">
                          {groupItems.map((conv) => {
                            const isActive = conv.id === activeId;
                            const lastMessage = conv.messages[conv.messages.length - 1];
                            const previewText = lastMessage
                              ? lastMessage.text.slice(0, 36)
                              : 'Empty chat';

                            return (
                              <div
                                key={conv.id}
                                className={`group relative rounded-xl transition-colors flex items-center justify-between ${
                                  isActive
                                    ? 'bg-stone-800 text-white font-medium border-l-2 border-emerald-500'
                                    : 'text-stone-300 hover:bg-stone-800/60'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectConversation(conv.id)}
                                  className="w-full text-left py-2 px-2.5 pr-8 flex flex-col gap-0.5 min-w-0"
                                >
                                  <span className="font-semibold text-xs truncate block text-stone-100">
                                    {conv.title || 'New conversation'}
                                  </span>
                                  <span className="text-[11px] text-stone-400 truncate block">
                                    {previewText}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConversation(conv.id);
                                  }}
                                  className="absolute right-2 p-1 text-stone-400 hover:text-rose-400"
                                  aria-label="Delete chat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MAIN WORKSPACE: Chat Thread & Persistent Composer         */}
        {/* ========================================================= */}
        <section aria-label="Chat Workspace" className="flex-1 flex flex-col min-w-0 h-full bg-stone-50 overflow-hidden relative">
          {/* Main Area Header */}
          <header className="h-14 px-4 sm:px-6 border-b border-stone-200 bg-white/90 backdrop-blur-xs flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Sidebar Trigger */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Open conversation sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>

              {/* Desktop Sidebar Toggle */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5" />
                )}
              </button>

              {/* Assistant Identity */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs shrink-0">
                  <Bot className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight truncate">
                    Kisan Mitra
                  </h1>
                  <p className="text-[11px] text-stone-500 truncate hidden sm:block">
                    {t('assistantSubHeader')}
                  </p>
                </div>
              </div>
            </div>

            {/* Conversation Active Title */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-stone-600 font-medium max-w-[140px] sm:max-w-xs truncate hidden md:inline-block">
                {activeConversation.title || 'New conversation'}
              </span>
            </div>
          </header>

          {/* Scrollable Message Thread */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 min-h-0"
          >
            {messages.length === 0 ? (
              /* New Conversation Empty State */
              <div className="min-h-full flex flex-col items-center justify-center text-center px-4 max-w-xl mx-auto space-y-6 animate-fadeIn">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                    {t('assistantEmptyHeading')}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md">
                    {t('assistantEmptyDescription')}
                  </p>
                </div>

                {/* Clickable Suggested Questions */}
                <div className="w-full space-y-2.5 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block text-left">
                    {t('assistantSuggestedQuestionsLabel')}:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isLoading || loadingConvId !== null}
                        onClick={() => {
                          if (!isLoading && loadingConvId === null) {
                            handleSendMessage(q);
                          }
                        }}
                        className="p-3.5 rounded-2xl border border-stone-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 disabled:opacity-50 text-stone-800 text-xs font-medium transition-all shadow-2xs flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-left"
                      >
                        <span className="flex-1 min-w-0 pr-2 leading-relaxed">{q}</span>
                        <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Real Message Thread */
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const isSpeakingThis = isSpeaking && activeContentId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 sm:gap-4 ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Assistant Avatar */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[92%] sm:max-w-xl md:max-w-2xl rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 ${
                          isUser
                            ? 'bg-emerald-800 text-white rounded-br-xs'
                            : msg.isError
                            ? 'bg-rose-50 border border-rose-300 text-rose-950 rounded-bl-xs'
                            : 'bg-white border border-stone-200 text-stone-900 rounded-bl-xs'
                        }`}
                      >
                        {/* User Image Attachment Preview */}
                        {msg.imageUrl && (
                          <div className="rounded-xl overflow-hidden max-h-56 border border-white/20 shadow-xs mb-2">
                            <img
                              src={msg.imageUrl}
                              alt="Crop attachment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Action Intent Badge */}
                        {!isUser && msg.actionIntent && (
                          <div className="mb-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                msg.actionIntent === 'SAFE_TO_SPRAY'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : msg.actionIntent === 'DO_NOT_SPRAY'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : msg.actionIntent === 'IRRIGATE_NOW'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-stone-100 text-stone-800 border-stone-300'
                              }`}
                            >
                              {msg.actionIntent.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}

                        {/* Message Text */}
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>

                        {/* Voice Commands Chips */}
                        {!isUser && msg.voiceCommands && msg.voiceCommands.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {msg.voiceCommands.map((cmd, cIdx) => (
                              <span
                                key={cIdx}
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-semibold"
                              >
                                <Mic className="w-3 h-3 mr-1 text-emerald-600" />
                                {cmd}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Detailed Response Accordion */}
                        {!isUser && msg.detailedResponse && (
                          <details className="pt-2 group">
                            <summary className="text-xs font-semibold text-emerald-700 cursor-pointer list-none flex items-center gap-1.5 hover:text-emerald-800 focus:outline-none">
                              <ArrowDown className="w-3.5 h-3.5 -rotate-90 group-open:rotate-0 transition-transform" />
                              <span>View Detailed Analysis</span>
                            </summary>
                            <div className="mt-2 text-xs sm:text-sm text-stone-700 whitespace-pre-wrap pl-3 border-l-2 border-emerald-200 leading-relaxed">
                              {msg.detailedResponse}
                            </div>
                          </details>
                        )}

                        {/* Actionable Steps Numbered List */}
                        {!isUser && msg.actionableSteps && msg.actionableSteps.length > 0 && (
                          <div className="pt-2 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                              <ListOrdered className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>{t('assistantActionableStepsTitle')}</span>
                            </div>
                            <ol className="space-y-1.5 list-none">
                              {msg.actionableSteps.map((step, sIdx) => (
                                <li
                                  key={sIdx}
                                  className="flex items-start gap-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-stone-800"
                                >
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0 mt-0.5">
                                    {sIdx + 1}
                                  </span>
                                  <span className="leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Verified Agronomic Sources */}
                        {!isUser && msg.sources && msg.sources.length > 0 && (
                          <div className="pt-2 border-t border-stone-100 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              {t('assistantVerifiedSourcesTitle')}:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.sources.map((src, srcIdx) => (
                                <span
                                  key={srcIdx}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[11px] text-stone-700 font-medium"
                                >
                                  <BookOpen className="w-3 h-3 text-stone-500 shrink-0" />
                                  <span>{src}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Related Follow-Up Topics (Clicking submits query) */}
                        {!isUser && msg.relatedTopics && msg.relatedTopics.length > 0 && (
                          <div className="pt-2 border-t border-stone-100 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              {t('assistantRelatedTopicsTitle')}:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.relatedTopics.map((topic, tIdx) => (
                                <button
                                  key={tIdx}
                                  type="button"
                                  disabled={isLoading || loadingConvId !== null}
                                  onClick={() => {
                                    if (!isLoading && loadingConvId === null) {
                                      handleSendMessage(topic);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium hover:bg-emerald-100 disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                  <span>{topic}</span>
                                  <ArrowRight className="w-3 h-3 text-emerald-600" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assistant Message Actions (Listen Aloud & Copy) */}
                        {!isUser && !msg.isError && (
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              {/* Listen Aloud Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (playingAudioId === msg.id) {
                                    if (audioRef.current) audioRef.current.pause();
                                    setPlayingAudioId(null);
                                    return;
                                  }
                                  if (isSpeakingThis) {
                                    stop();
                                    return;
                                  }
                                  if (audioRef.current) {
                                    audioRef.current.pause();
                                    setPlayingAudioId(null);
                                  }
                                  stop();

                                  if (msg.audioBase64) {
                                    let src = msg.audioBase64;
                                    if (!src.startsWith('data:')) {
                                      src = `data:audio/mp3;base64,${src}`;
                                    }
                                    const audio = new Audio(src);
                                    audio.onended = () => setPlayingAudioId(null);
                                    audio.onerror = () => setPlayingAudioId(null);
                                    audioRef.current = audio;
                                    setPlayingAudioId(msg.id);
                                    audio.play().catch(() => setPlayingAudioId(null));
                                  } else {
                                    speak(msg.spokenSummary || msg.text, msg.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                aria-label={isSpeakingThis || playingAudioId === msg.id ? t('voiceStop') : t('assistantListenAloud')}
                              >
                                {isSpeakingThis || playingAudioId === msg.id ? (
                                  <>
                                    <Square className="w-3.5 h-3.5 fill-current text-rose-600 animate-pulse" />
                                    <span>{t('assistantStopSpeech')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>{t('assistantListenAloud')}</span>
                                  </>
                                )}
                              </button>

                              {/* Copy Message Action */}
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.text)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                                title="Copy response text"
                                aria-label="Copy response text"
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700 font-semibold">{t('assistantCopied')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{t('assistantCopy')}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <span className="text-[11px] text-stone-400 font-mono">
                              {msg.timestamp}
                            </span>
                          </div>
                        )}

                        {/* Error Message Retry Action */}
                        {msg.isError && (
                          <div className="pt-2 flex items-center justify-between gap-2 text-xs border-t border-rose-200">
                            <div className="flex items-center gap-1.5 text-rose-700">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[11px]">Service advisory error — request did not complete.</span>
                            </div>
                            <button
                              type="button"
                              disabled={isLoading || loadingConvId !== null}
                              onClick={() => handleRetry(msg.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                              aria-label={t('assistantRetry')}
                            >
                              <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                              <span>{t('assistantRetry')}</span>
                            </button>
                          </div>
                        )}

                        {/* User Timestamp */}
                        {isUser && (
                          <div className="text-right">
                            <span className="text-[11px] text-emerald-200 font-mono">
                              {msg.timestamp}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {isUser && (
                        <div className="w-8 h-8 rounded-full bg-emerald-900 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Live Loading Indicator */}
                {isLoading && (
                  <div className="flex gap-3 justify-start items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="rounded-2xl p-3.5 bg-white border border-stone-200 text-stone-600 rounded-bl-xs flex items-center gap-2.5 shadow-2xs">
                      <RotateCw className="w-4 h-4 animate-spin text-emerald-700" />
                      <span className="text-xs font-medium">{t('assistantConsultingEngine')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* BOTTOM COMPOSER: Anchored persistently                    */}
          {/* ========================================================= */}
          <div className="shrink-0 px-4 sm:px-6 lg:px-8 pb-4 pt-2 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Mic Warning Banner */}
              {micNotice && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-950 animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="truncate">{micNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMicNotice(null)}
                    className="p-1 rounded-lg hover:bg-amber-100 text-amber-800"
                    aria-label="Dismiss notice"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Image Error Banner */}
              {requestError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-950 animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span className="truncate">{requestError.userMessage || 'Service request failed. Please check network.'}</span>
                  </div>
                  <button type="button" onClick={() => setRequestError(null)} className="p-1 rounded-lg hover:bg-rose-100 text-rose-800">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {imageError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-950 animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span className="truncate">{imageError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageError(null)}
                    className="p-1 rounded-lg hover:bg-rose-100 text-rose-800"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Active Voice Recording Status Bar */}
              {isRecording && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                    </span>
                    <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                      <span>{t('assistantListeningState')}</span>
                      <span className="font-mono bg-rose-200/80 text-rose-950 px-1.5 py-0.2 rounded text-[11px]">
                        {formatSeconds(recordingSeconds)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStopVoiceInput}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {t('assistantDoneBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelVoiceInput}
                      className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Selected Image Attachment Preview */}
              {imagePreviewUrl && (
                <div className="p-2 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={imagePreviewUrl}
                      alt="Crop attachment preview"
                      className="w-10 h-10 rounded-lg object-cover border border-stone-300 shrink-0"
                    />
                    <div className="text-xs min-w-0">
                      <p className="font-semibold text-stone-800 truncate">
                        {selectedImage?.name || 'Attached Photo'}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {selectedImage ? formatFileSize(selectedImage.size) : ''} • {t('assistantReadyToSend')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 focus:outline-none"
                    aria-label={t('removeImageBtn')}
                    title={t('removeImageBtn')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Multimodal Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isLoading && loadingConvId === null) {
                    handleSendMessage();
                  }
                }}
                className="bg-white border-2 border-stone-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl p-2 shadow-sm transition-all"
              >
                <div className="flex items-end gap-1.5 sm:gap-2">
                  {/* Hidden File Inputs */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleImageSelect(e.target.files?.[0])}
                    accept="image/jpeg,image/png,image/webp,image/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={(e) => handleImageSelect(e.target.files?.[0])}
                    accept="image/jpeg,image/png,image/webp,image/*"
                    capture="environment"
                    className="hidden"
                  />

                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2 rounded-xl text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    aria-label={t('cameraBtn')}
                    title={t('cameraBtn')}
                  >
                    <Camera className="w-5 h-5" />
                  </button>

                  {/* Image Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    aria-label={t('uploadBtn')}
                    title={t('uploadBtn')}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  {/* Voice Mic Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`p-2 rounded-xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                      isRecording
                        ? 'bg-rose-600 text-white animate-pulse shadow-xs'
                        : 'text-stone-600 hover:text-emerald-700 hover:bg-emerald-50'
                    }`}
                    aria-label={isRecording ? t('voiceStop') : t('voiceSpeaking')}
                    title={isRecording ? t('voiceStop') : t('voiceReadAloud')}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    dir="auto"
                    placeholder={
                      isRecording
                        ? t('assistantPlaceholderListening')
                        : 'Ask Kisan Mitra...'
                    }
                    className="flex-1 min-w-0 min-h-[40px] max-h-36 py-2 px-3 text-sm text-stone-900 bg-transparent focus:outline-none resize-none leading-normal"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !selectedImage) || isLoading || loadingConvId !== null}
                    className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shrink-0"
                    aria-label={t('assistantSendQueryBtn')}
                    title={t('assistantSendQueryBtn')}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Legal / AI Advisory Disclaimer */}
              <p className="text-[10px] text-center text-stone-500 select-none">
                Kisan Mitra provides AI decision-support guidance • Verify critical treatments with local KVK agricultural officers.
              </p>
            </div>
          </div>
        </section>
    </div>
  );
};
