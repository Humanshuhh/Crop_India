import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useVoice } from '../context/VoiceContext';
import { queryFarmerAssistant } from '../services/assistant';
import type { AssistantMessage, FarmerAssistantResult } from '../types/assistant.types';
import type { NormalizedError } from '../types/api.types';


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

import { useResultCache } from '../context/ResultCacheContext';

export const FarmerAssistant: React.FC = () => {
  const { language, t } = useLanguage();
  const { isSpeaking, activeContentId, speak, stop } = useVoice();
  const location = useLocation();
  const { assistantCache, setAssistantCache } = useResultCache();



  const messages = assistantCache.messages;
  const inputText = assistantCache.inputText;
  const selectedImage = assistantCache.selectedImage;
  const imagePreviewUrl = assistantCache.imagePreviewUrl;

  const setMessages = (val: React.SetStateAction<AssistantMessage[]>) => setAssistantCache(p => ({ ...p, messages: typeof val === 'function' ? (val as any)(p.messages) : val }));
  const setInputText = (val: React.SetStateAction<string>) => setAssistantCache(p => ({ ...p, inputText: typeof val === 'function' ? (val as any)(p.inputText) : val }));
  const setSelectedImage = (val: React.SetStateAction<File | null>) => setAssistantCache(p => ({ ...p, selectedImage: typeof val === 'function' ? (val as any)(p.selectedImage) : val }));
  const setImagePreviewUrl = (val: React.SetStateAction<string | null>) => setAssistantCache(p => ({ ...p, imagePreviewUrl: typeof val === 'function' ? (val as any)(p.imagePreviewUrl) : val }));

  const [imageError, setImageError] = useState<string | null>(null);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [, setServiceNotice] = useState<string | null>(null);
  const [, setApiStatus] = useState<'pending' | 'connected' | 'error'>('pending');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Reset nested scroll container on route change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);
  useEffect(() => {
    const container = scrollContainerRef.current;

    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);
  // Handle Speech Recognition setup
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
      handleSendMessage();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!query && !selectedImage) return;

    const userMessageId = `user-${Date.now()}`;
    const newUserMessage: AssistantMessage = {
      id: userMessageId,
      sender: 'user',
      text: query,
      imageUrl: imagePreviewUrl || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const imageToSubmit = selectedImage;
    handleRemoveImage();
    setIsLoading(true);
    setServiceNotice(null);

    try {
      const result: FarmerAssistantResult = await queryFarmerAssistant({
        query_text: query,
        target_language: language,
        image_file: imageToSubmit || undefined,
      });

      setApiStatus('connected');

      const assistantMsg: AssistantMessage = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        text: result.voiceAdvisory || result.text,
        spokenSummary: result.voiceAdvisory ||result. text,
        audioBase64: result.audioBase64,
        voiceCommands: result.voiceCommands,
        actionIntent: result.actionIntent,
        detailedResponse: result.detailedResponse,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setApiStatus('error');
      const normErr = err as NormalizedError;
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text:
          normErr.userMessage ||
          'Assistant service temporarily unavailable. Please verify backend environment configuration.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      setServiceNotice(
        normErr.userMessage ||
          'The endpoint POST /api/v1/farmer/query was contacted, but returned an upstream service error.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col h-full min-h-0">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-stone-200 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
            <Bot className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                Kisan Mitra
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-600">
              {t('assistantSubHeader')}
            </p>
          </div>
        </div>

        {/* Header Actions: Demo Preview Toggle & Voice Ready badge */}
        <div className="flex items-center gap-2">

          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-2.5 py-1.5 rounded-xl border border-stone-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('assistantVoiceVisionReady')}</span>
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto py-6 space-y-6"
      >
        {messages.length === 0 ? (
          /* Empty / Initial State with Agricultural Prompts */
          <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-6 max-w-lg mx-auto my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-stone-900">
                {t('assistantEmptyStateTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {t('assistantEmptyStatePrompt')}
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="w-full space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block text-left">
                {t('assistantSuggestedQuestionsLabel')}:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {[
                  t('assistantSuggestedQuestion1'),
                  t('assistantSuggestedQuestion2'),
                  t('assistantSuggestedQuestion3'),
                  t('assistantSuggestedQuestion4'),
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="min-h-[44px] text-left text-xs p-3 rounded-xl border border-stone-200 bg-white hover:bg-emerald-50/60 hover:border-emerald-300 text-stone-800 font-medium transition-all shadow-2xs flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <span className="flex-1 min-w-0 break-words">{q}</span>
                    <ArrowDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600 -rotate-90 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) =>
          {
            const isUser = msg.sender === 'user';
            const isSpeakingThis = isSpeaking && activeContentId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-md md:max-w-lg rounded-2xl p-4 shadow-2xs space-y-3 ${
                    isUser
                      ? 'bg-emerald-800 text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-amber-50 border border-amber-300 text-amber-950 rounded-bl-xs'
                      : 'bg-white border border-stone-200 text-stone-900 rounded-bl-xs'
                  }`}
                >
                  {/* User image attachment preview in bubble */}
                  {msg.imageUrl && (
                    <div className="rounded-xl overflow-hidden max-h-56 border border-white/20 shadow-xs">
                      <img
                        src={msg.imageUrl}
                        alt="Crop foliage attached by user"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Action Intent Badge */}
                  {!isUser && msg.actionIntent && (
                    <div className="mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        msg.actionIntent === 'SAFE_TO_SPRAY' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        msg.actionIntent === 'DO_NOT_SPRAY' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        msg.actionIntent === 'IRRIGATE_NOW' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        'bg-stone-100 text-stone-800 border border-stone-300'
                      }`}>
                        {msg.actionIntent.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}

                  {/* Message body text */}
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {("voiceAdvisory" in msg && typeof msg.voiceAdvisory === "string" ? msg.voiceAdvisory : msg.text)}
                  </p>



                  {/* Voice Commands */}
                  {!isUser && msg.voiceCommands && msg.voiceCommands.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.voiceCommands.map((cmd, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700 font-semibold"
                        >
                          <Mic className="w-3 h-3 mr-1" />
                          {cmd}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Detailed Response (Accordion) */}
                  {!isUser && msg.detailedResponse && (
                    <details className="pt-2 group">
                      <summary className="text-xs font-semibold text-emerald-700 cursor-pointer list-none flex items-center gap-1.5 hover:text-emerald-800 focus:outline-none">
                        <ArrowDown className="w-3.5 h-3.5 -rotate-90 group-open:rotate-0 transition-transform" />
                        'View Detailed Analysis'
                      </summary>
                      <div className="mt-2 text-sm sm:text-base text-stone-700 whitespace-pre-wrap pl-3 border-l-2 border-emerald-100">
                        {msg.detailedResponse}
                      </div>
                    </details>
                  )}

                  {/* Formatted Actionable Field Steps (if provided) */}
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
                            className="flex items-start gap-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 text-stone-800"
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

                  {/* Verified Sources / Agronomic References */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-stone-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        {t('assistantVerifiedSourcesTitle')}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, srcIdx) => (
                          <span
                            key={srcIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[11px] text-stone-700 font-medium"
                          >
                            <BookOpen className="w-3 h-3 text-stone-500 shrink-0" />
                            <span>{src}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Follow-Up Inquiries */}
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
                            onClick={() => {
                              setInputText(topic);
                              if (textareaRef.current) {
                                textareaRef.current.focus();
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium hover:bg-emerald-100 transition-colors"
                          >
                            <span>{topic}</span>
                            <ArrowDown className="w-3 h-3 -rotate-90 text-emerald-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assistant Footer with Read Aloud trigger */}
                  {!isUser && !msg.isError && (msg.spokenSummary || msg.text) && (
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (playingAudioId === msg.id) {
                            if (audioRef.current) {
                              audioRef.current.pause();
                            }
                            setPlayingAudioId(null);
                            return;
                          }
                          if (isSpeakingThis) {
                            stop();
                            return;
                          }

                          // Stop any currently playing base64 audio
                          if (audioRef.current) {
                            audioRef.current.pause();
                            setPlayingAudioId(null);
                          }
                          // Stop any currently playing speech synthesis
                          stop();

                          if (msg.audioBase64) {
                            let src = msg.audioBase64;
                            if (!src.startsWith('data:')) {
                              src = `data:audio/mp3;base64,${src}`;
                            }
                            const audio = new Audio(src);
                            audio.onended = () => setPlayingAudioId(null);
                            audio.onerror = () => {
                              console.error('Audio playback failed');
                              setPlayingAudioId(null);
                            };
                            audioRef.current = audio;
                            setPlayingAudioId(msg.id);
                            audio.play().catch(e => {
                              console.error('Playback prevented', e);
                              setPlayingAudioId(null);
                            });
                          } else {
                            speak(msg.spokenSummary || ("voiceAdvisory" in msg && typeof msg.voiceAdvisory === "string" ? msg.voiceAdvisory : msg.text), msg.id);
                          }
                        }}
                        className="min-h-[44px] inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        aria-label={(isSpeakingThis || playingAudioId === msg.id) ? t('voiceStop') : t('voiceReadAloud')}
                      >
                        {(isSpeakingThis || playingAudioId === msg.id) ? (
                          <>
                            <Square className="w-4 h-4 fill-current text-rose-600 animate-pulse" />
                            <span>{t('assistantStopSpeech')}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 text-emerald-700" />
                            <span>{t('assistantListenAloud')}</span>
                          </>
                        )}
                      </button>

                      <span className="text-[11px] text-stone-400">
                        {msg.timestamp}
                      </span>
                    </div>
                  )}

                  {isUser && (
                    <div className="text-right">
                      <span className="text-[11px] text-emerald-200">
                        {msg.timestamp}
                      </span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Loading State */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl p-4 bg-white border border-stone-200 text-stone-600 rounded-bl-xs flex items-center gap-2.5 shadow-2xs">
              <RotateCw className="w-4 h-4 animate-spin text-emerald-700" />
              <span className="text-xs font-medium">{t('assistantConsultingEngine')}</span>
            </div>
          </div>
        )}

      </div>

      {/* Mic Warning Banner */}
      {micNotice && (
        <div className="shrink-0 p-3 bg-amber-50 border border-amber-300 rounded-2xl mb-3 flex items-center justify-between gap-3 text-xs text-amber-950 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{micNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setMicNotice(null)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1 rounded-lg hover:bg-amber-100 text-amber-800 focus:outline-none"
            aria-label="Dismiss microphone notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Error Banner */}
      {imageError && (
        <div className="shrink-0 p-3 bg-rose-50 border border-rose-300 rounded-2xl mb-3 flex items-center justify-between gap-3 text-xs text-rose-950 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{imageError}</span>
          </div>
          <button
            type="button"
            onClick={() => setImageError(null)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1 rounded-lg hover:bg-rose-100 text-rose-800 focus:outline-none"
            aria-label="Dismiss image error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Voice Recording Status Bar */}
      {isRecording && (
        <div className="shrink-0 p-3 bg-rose-50 border border-rose-300 rounded-2xl mb-3 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
            </span>
            <div className="text-xs">
              <p className="font-bold text-rose-950 flex items-center gap-1.5">
                <span>{t('assistantListeningState')}</span>
                <span className="font-mono bg-rose-200/70 text-rose-950 px-1.5 py-0.2 rounded font-semibold">
                  {formatSeconds(recordingSeconds)}
                </span>
              </p>
              <p className="text-rose-800">

              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStopVoiceInput}
              className="min-h-[44px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              aria-label={t('assistantDoneBtn')}
            >
              {t('assistantDoneBtn')}
            </button>
            <button
              type="button"
              onClick={handleCancelVoiceInput}
              className="min-h-[44px] px-3 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-stone-400"
              aria-label={t('cancel')}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Selected Image Attachment Preview Card */}
      {imagePreviewUrl && (
        <div className="shrink-0 p-2.5 bg-stone-100 border border-stone-200 rounded-2xl mb-3 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={imagePreviewUrl}
              alt="Preview of selected crop photo"
              className="w-12 h-12 rounded-xl object-cover border border-stone-300 shrink-0"
            />
            <div className="text-xs min-w-0">
              <p className="font-semibold text-stone-800 truncate">
                {selectedImage?.name || 'Attached Photo'}
              </p>
              <p className="text-stone-500">
                {selectedImage ? formatFileSize(selectedImage.size) : ''} • {t('assistantReadyToSend')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-stone-200 text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-400"
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
          handleSendMessage();
        }}
        className="shrink-0 bg-white border-2 border-stone-300 focus-within:border-emerald-600 rounded-3xl p-2 sm:p-2.5 shadow-sm transition-all"
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

          {/* Camera Capture Button */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="min-h-[44px] min-w-[44px] rounded-2xl text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t('cameraBtn')}
            title={t('cameraBtn')}
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Upload Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] min-w-[44px] rounded-2xl text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t('uploadBtn')}
            title={t('uploadBtn')}
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            className={`min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-xs'
                : 'text-stone-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
            aria-label={isRecording ? t('voiceStop') : t('voiceSpeaking')}
            title={isRecording ? t('voiceStop') : t('voiceReadAloud')}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Multiline Textarea */}
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
                : t('assistantPlaceholderDefault')
            }
            className="flex-1 min-w-0 min-h-[44px] max-h-36 py-2.5 px-3 text-sm sm:text-base text-stone-900 bg-transparent focus:outline-none resize-none leading-normal"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isLoading}
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={t('assistantSendQueryBtn')}
            title={t('assistantSendQueryBtn')}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
