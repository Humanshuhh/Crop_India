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
  Info,
  Eye,
  AlertTriangle,
  ListOrdered,
  BookOpen,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useVoice } from '../context/VoiceContext';
import { queryFarmerAssistant } from '../services/assistant';
import type { AssistantMessage, FarmerAssistantResult } from '../types/assistant.types';
import type { NormalizedError } from '../types/api.types';
import type { SupportedLanguage } from '../types/i18n.types';
import { ResultLanguageSelector } from '../components/common/ResultLanguageSelector';

const SUGGESTED_QUESTIONS = [
  'How to prepare fermented Jeevamrit at home?',
  'What are the non-chemical remedies for yellow leaf spot?',
  'Which green manure crop is best before sowing wheat?',
  'How to protect crops during unexpected heavy rainfall?',
];

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

// Sample demo conversation illustrating structured response hierarchy
const DEMO_CONVERSATION: AssistantMessage[] = [
  {
    id: 'demo-user-1',
    sender: 'user',
    text: 'Yellow spots with concentric brown rings are appearing on the lower leaves of my tomato crop. How should I manage this organically without chemical pesticides?',
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=600&auto=format&fit=crop&q=80',
    timestamp: '10:14 AM',
  },
  {
    id: 'demo-assistant-1',
    sender: 'assistant',
    text: 'Based on the concentric brown rings and lower-canopy chlorosis visible in your attached image, the crop shows characteristic symptoms of Early Blight (Alternaria solani). Because fungal spores flourish in canopy moisture, prompt organic canopy management and bio-prophylaxis are recommended.',
    actionableSteps: [
      'Prune and safely compost/destroy infected lower leaves (up to 25-30 cm above soil level) to eliminate ground-spore splash and improve airflow.',
      'Spray sour fermented buttermilk (diluted 1:10 with water) or 5% Neem Seed Kernel Extract (NSKE) early in the morning before sunlight intensifies.',
      'Apply Trichoderma viride bio-fungicide (5g/L water) around the root zone and mulch with dry paddy straw to prevent soil-to-leaf splashing during watering.',
      'Avoid overhead wetting; switch to targeted drip or root-zone watering to keep foliage dry.',
    ],
    sources: [
      'ICAR-IARI Division of Plant Pathology Advisory',
      'National Center for Organic & Natural Farming (NCONF)',
      'KVK Integrated Pest Management Package',
    ],
    relatedTopics: [
      'How to prepare Neem Seed Kernel Extract (NSKE)?',
      'Companion planting with marigold for nematode control',
    ],
    spokenSummary:
      'Early blight symptoms detected on your tomato leaves. Prune bottom foliage, spray fermented sour buttermilk at 1:10 dilution in the morning, and mulch around root zone to restrict fungal spore splash.',
    timestamp: '10:15 AM',
  },
];

export const FarmerAssistant: React.FC = () => {
  const { language, currentLanguageMeta } = useLanguage();
  const { isSpeaking, activeContentId, speak, stop } = useVoice();

  const [assistantLanguage, setAssistantLanguage] = useState<SupportedLanguage>(language);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceNotice, setServiceNotice] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'pending' | 'connected' | 'error'>('pending');
  const [showDemoPreview, setShowDemoPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, showDemoPreview]);

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

    if (showDemoPreview) {
      setShowDemoPreview(false);
    }

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
        target_language: assistantLanguage,
        image_file: imageToSubmit || undefined,
      });

      setApiStatus('connected');

      const assistantMsg: AssistantMessage = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        text: result.text,
        spokenSummary: result.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  const displayedMessages = showDemoPreview ? DEMO_CONVERSATION : messages;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col h-[calc(100vh-5rem)]">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
            <Bot className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                Kisan Mitra
              </h1>
              {apiStatus === 'connected' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Connected
                </span>
              ) : apiStatus === 'error' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                  Service Unavailable
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  API Wired
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-600">
              Multimodal Agricultural & Soil Assistant
            </p>
          </div>
        </div>

        {/* Header Actions: Demo Preview Toggle & Voice Ready badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDemoPreview(!showDemoPreview)}
            className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              showDemoPreview
                ? 'bg-amber-100 border-amber-300 text-amber-950 shadow-2xs'
                : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
            }`}
            aria-label={showDemoPreview ? 'Exit UI Demo Preview' : 'Inspect Demo Response Layout'}
          >
            <Eye className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">
              {showDemoPreview ? 'Exit Demo Preview' : 'Inspect Demo Response Layout'}
            </span>
            <span className="sm:hidden">
              {showDemoPreview ? 'Exit Demo' : 'Demo Layout'}
            </span>
          </button>

          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-2.5 py-1.5 rounded-xl border border-stone-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Voice & Vision Ready</span>
          </span>
        </div>
      </div>

      {/* Demo Mode Notice */}
      {showDemoPreview && (
        <div className="mt-3 shrink-0 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs animate-fadeIn">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">UI Design Preview Active (Demo Only)</p>
            <p className="text-amber-900/90 leading-relaxed">
              Demonstrating structured actionable field steps, agronomic source citations, and audio advisory playback. No fake backend API calls are made.
            </p>
          </div>
        </div>
      )}

      {/* Backend Status Notice */}
      {!showDemoPreview && (
        <div className={`mt-3 shrink-0 rounded-xl p-3 text-xs flex items-start gap-2 border ${
          apiStatus === 'connected'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : apiStatus === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <Info className={`w-4 h-4 shrink-0 mt-0.5 ${
            apiStatus === 'connected'
              ? 'text-emerald-700'
              : apiStatus === 'error'
              ? 'text-rose-700'
              : 'text-amber-700'
          }`} />
          <div className="space-y-0.5">
            <p className="font-semibold">
              {apiStatus === 'connected'
                ? 'Connected to Live AI Engine'
                : apiStatus === 'error'
                ? 'Backend Service Error'
                : 'Connected to POST /api/v1/farmer/query'}
            </p>
            <p className="leading-relaxed opacity-90">
              {serviceNotice || (
                <>
                  Wired directly to <code className="font-mono bg-black/5 px-1 py-0.5 rounded">POST /api/v1/farmer/query</code> via multipart/form-data. Type or speak your query below to consult the assistant.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {displayedMessages.length === 0 ? (
          /* Empty / Initial State with Agricultural Prompts */
          <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-6 max-w-lg mx-auto my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-stone-900">
                Ask Kisan Mitra
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Type in your regional language, speak via microphone, or attach plant foliage photos for regenerative farming guidance.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="w-full space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block text-left">
                Suggested Questions:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="min-h-[44px] text-left text-xs p-3 rounded-xl border border-stone-200 bg-white hover:bg-emerald-50/60 hover:border-emerald-300 text-stone-800 font-medium transition-all shadow-2xs flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <span>{q}</span>
                    <ArrowDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600 -rotate-90 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          displayedMessages.map((msg) => {
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

                  {/* Message body text */}
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </p>

                  {/* Formatted Actionable Field Steps (if provided) */}
                  {!isUser && msg.actionableSteps && msg.actionableSteps.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        <ListOrdered className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Actionable Field Steps</span>
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
                        Verified Sources & References:
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
                        Related Follow-Up Questions:
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
                          if (isSpeakingThis) {
                            stop();
                          } else {
                            speak(msg.spokenSummary || msg.text, msg.id);
                          }
                        }}
                        className="min-h-[44px] inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        aria-label={isSpeakingThis ? 'Stop voice reading' : 'Listen to advisory spoken aloud'}
                      >
                        {isSpeakingThis ? (
                          <>
                            <Square className="w-4 h-4 fill-current text-rose-600 animate-pulse" />
                            <span>Stop Speech</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 text-emerald-700" />
                            <span>Listen Aloud</span>
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
              <span className="text-xs font-medium">Consulting Kisan Agro-Pathology Engine...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
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
                <span>Speech-to-Text Input</span>
                <span className="font-mono bg-rose-200/70 text-rose-950 px-1.5 py-0.2 rounded font-semibold">
                  {formatSeconds(recordingSeconds)}
                </span>
              </p>
              <p className="text-rose-800">
                Listening in {currentLanguageMeta?.name || 'regional language'} ({currentLanguageMeta?.code || 'hi-IN'})... Spoken words will appear in the text box for your review.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStopVoiceInput}
              className="min-h-[44px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              aria-label="Finish speaking and keep transcribed text"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleCancelVoiceInput}
              className="min-h-[44px] px-3 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-stone-400"
              aria-label="Cancel speech-to-text input"
            >
              Cancel
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
                {selectedImage ? formatFileSize(selectedImage.size) : ''} • Image Attached (Ready to Send)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl hover:bg-stone-200 text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-400"
            aria-label="Remove attached image"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Response Language Control */}
      <div className="shrink-0 flex items-center justify-between pb-2 px-1">
        <ResultLanguageSelector
          id="assistant-response-language"
          label="Response Language"
          value={assistantLanguage}
          onChange={setAssistantLanguage}
          compact
        />
        <span className="text-[11px] text-stone-500 hidden sm:inline">
          AI answers will be generated in this language
        </span>
      </div>

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
            aria-label="Take crop photo with camera"
            title="Take Photo"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Upload Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] min-w-[44px] rounded-2xl text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Upload photo from gallery"
            title="Upload Photo"
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
            aria-label={isRecording ? 'Stop speech recognition' : 'Speech-to-text input via microphone'}
            title={isRecording ? 'Stop Speech Input' : 'Voice Input (Speech to Text)'}
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
                ? `Listening to speech (${recordingSeconds}s)... Spoken words will appear here...`
                : 'Ask in Hindi, English, Marathi, Bengali, Tamil, Telugu... (Shift+Enter for newline)'
            }
            className="flex-1 min-w-0 min-h-[44px] max-h-36 py-2.5 px-3 text-sm sm:text-base text-stone-900 bg-transparent focus:outline-none resize-none leading-normal"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isLoading}
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Send Query"
            title="Send Query"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
