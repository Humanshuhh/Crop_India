import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Activity,
  Volume2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useVoice } from '../context/VoiceContext';
import { diagnoseCrop, MAX_IMAGE_SIZE_BYTES } from '../services/diagnosis';
import type { CropDiagnosisResponse } from '../types/diagnosis.types';
import type { NormalizedError } from '../types/api.types';
import { VoiceReaderButton } from '../components/common/VoiceReaderButton';
import { ErrorMessage } from '../components/common/ErrorMessage';


import { useResultCache } from '../context/ResultCacheContext';

export const FasalRogPehchan: React.FC = () => {
  const { t, language } = useLanguage();
  const { isSpeaking, activeContentId, currentSentenceIndex } = useVoice();
  const { cropCache, setCropCache } = useResultCache();



  const selectedFile = cropCache.selectedFile;
  const imagePreviewUrl = cropCache.imagePreviewUrl;
  const result = cropCache.result;

  const setSelectedFile = (val: React.SetStateAction<File | null>) => setCropCache(p => ({ ...p, selectedFile: typeof val === 'function' ? (val as any)(p.selectedFile) : val }));
  const setImagePreviewUrl = (val: React.SetStateAction<string | null>) => setCropCache(p => ({ ...p, imagePreviewUrl: typeof val === 'function' ? (val as any)(p.imagePreviewUrl) : val }));
  const setResult = (val: React.SetStateAction<CropDiagnosisResponse | null>) => setCropCache(p => ({ ...p, result: typeof val === 'function' ? (val as any)(p.result) : val }));

  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [error, setError] = useState<NormalizedError | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | undefined) => {
    setError(null);
    if (!file) return;

    // Validate size per Addendum §6
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError({
        category: 'VALIDATION_ERROR',
        userMessage: 'This photo is too large (max 10MB). Try taking a new photo or choosing a smaller one.',
      });
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError({
        category: 'VALIDATION_ERROR',
        userMessage: 'Please select or take a photo of an affected crop leaf first.',
      });
      return;
    }

    setIsDiagnosing(true);
    setError(null);

    try {
      const diagnosis = await diagnoseCrop(selectedFile, language);
      setResult(diagnosis);
      setTimeout(() => {
        document.getElementById('diagnosis-result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err as NormalizedError);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const textToRead = result
    ? (result.audio_advisory_script || result.spoken_summary || '')
    : '';

  const diagnosisSentences = result
    ? textToRead
        .split(/(?<=[.?!।\n])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const isVoiceReadingThisReport = isSpeaking && activeContentId === 'crop-diagnosis-report';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <Activity className="w-4 h-4" />
          <span>Multimodal Plant Pathology</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
          {t('fasalTitle')}
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-3xl">
          {t('fasalSubtitle')}
        </p>
      </div>

      {/* Main Upload / Camera Card */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-stone-100 pb-4">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            <span>{t('uploadSectionTitle')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {t('uploadHelp')}
          </p>
        </div>

        {/* Hidden inputs for camera and regular file picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />

        {/* Upload Buttons */}
        {!imagePreviewUrl ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-24 p-5 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all flex flex-col items-center justify-center gap-2 text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <Camera className="w-7 h-7 text-emerald-700" />
              <span className="font-bold text-sm sm:text-base">{t('cameraBtn')}</span>
              <span className="text-[11px] text-emerald-700/80 font-normal">Capture live leaf photo</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-24 p-5 rounded-xl border-2 border-dashed border-stone-300 hover:border-stone-500 bg-stone-50 hover:bg-stone-100 transition-all flex flex-col items-center justify-center gap-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              <Upload className="w-7 h-7 text-stone-700" />
              <span className="font-bold text-sm sm:text-base">{t('uploadBtn')}</span>
              <span className="text-[11px] text-stone-500 font-normal">{t('fileLimitText')}</span>
            </button>
          </div>
        ) : (
          /* Image Preview and Actions */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700">
                {t('imagePreviewTitle')} ({selectedFile?.name})
              </h3>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('removeImageBtn')}</span>
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-900 flex items-center justify-center max-h-96">
              <img
                src={imagePreviewUrl}
                alt="Captured crop leaf preview"
                className="max-h-96 w-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* Error message if any */}
        {error && <ErrorMessage error={error} onRetry={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} />}

        {/* Submit Diagnose Button & Result Language */}
        {imagePreviewUrl && (
          <div className="pt-2 space-y-4">
            <div className="w-full sm:max-w-xs">

            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isDiagnosing}
              className="w-full sm:w-auto min-h-14 px-8 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {isDiagnosing ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin" />
                  <span>{t('diagnosingProgress')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{t('diagnoseBtn')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* Real Diagnosis Result Card */}
      {result && (
        <section
          id="diagnosis-result-section"
          className="rounded-3xl border-2 border-emerald-600 bg-white p-6 sm:p-8 md:p-10 shadow-lg space-y-8 animate-fadeIn"
          aria-label="Pathology Diagnostic Results"
        >
          {/* Header with Voice and Language Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Diagnostic Pathology Report</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                {result.crop_name ? `${result.crop_name} — ` : ''}{result.detected_condition}
              </h2>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <VoiceReaderButton
                textToRead={textToRead}
                contentId="crop-diagnosis-report"
                sentences={diagnosisSentences}
                label={t('voiceReadAloud')}
                language={language}
              />
            </div>
          </div>

          {/* Plant Detection Validation */}
          {!result.is_plant_detected && (
            <div
              role="alert"
              className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex items-start gap-3"
            >
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm sm:text-base text-amber-950">
                  {t('noPlantDetected')}
                </h3>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  The AI engine could not clearly identify crop leaf foliage in this photograph. Please capture a clear, close-up photo in bright natural daylight.
                </p>
              </div>
            </div>
          )}

          {/* 1. Diagnosis & Urgency Grid: Condition, Crop, Real Confidence Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50">
              <span className="text-xs font-semibold text-stone-500 uppercase block mb-1">
                {t('conditionLabel')}
              </span>
              <span className="font-bold text-stone-900 text-base">
                {result.detected_condition}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50">
              <span className="text-xs font-semibold text-stone-500 uppercase block mb-1">
                Crop Identified
              </span>
              <span className="font-bold text-stone-900 text-base">
                {result.crop_name || 'Crop Leaf Detected'}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50">
              <span className="text-xs font-semibold text-stone-500 uppercase block mb-1">
                {t('confidenceLabel')}
              </span>
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                  result.confidence_level === 'HIGH'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : result.confidence_level === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-stone-200 text-stone-800 border border-stone-300'
                }`}
              >
                {result.confidence_level}
              </span>
            </div>
          </div>

          {/* 2. Immediate Remedy & Application (Eco-Friendly & Biological) */}
          {result.eco_friendly_remedies && result.eco_friendly_remedies.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-700" />
                  <span>{t('ecoRemediesTitle')} (Immediate Action)</span>
                </h3>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Organic & Safe
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {result.eco_friendly_remedies.map((remedy, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3 shadow-2xs"
                  >
                    <div className="font-bold text-base text-emerald-950 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{remedy.title}</span>
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Non-Chemical
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-stone-700 pl-8 space-y-1.5">
                      <p>
                        <strong className="text-emerald-900">Preparation:</strong> {remedy.preparation}
                      </p>
                      <p>
                        <strong className="text-emerald-900">Application:</strong> {remedy.application}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Cultural Prevention Practices */}
          {result.preventive_cultural_practices && result.preventive_cultural_practices.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-700" />
                <span>{t('culturalPracticesTitle')}</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700 bg-stone-50 p-4 rounded-xl border border-stone-200">
                {result.preventive_cultural_practices.map((practice, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{practice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Observed Visual Symptoms (Supporting Diagnostics) */}
          {result.visual_symptoms && result.visual_symptoms.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-stone-500" />
                <span>{t('symptomsTitle')}</span>
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm text-stone-700">
                {result.visual_symptoms.map((symptom, idx) => (
                  <li key={idx} className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></span>
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 5. Underlying Pathogen & Cause (Scientific Etiology) */}
          {result.underlying_cause && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                {t('causeTitle')} (Pathogen Etiology)
              </h3>
              <p className="text-xs sm:text-sm text-stone-800 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-200">
                {result.underlying_cause}
              </p>
            </div>
          )}


          {/* Spoken Summary with Sentence-level visual tracking */}
          {textToRead && (
            <div className="rounded-2xl border border-stone-200 p-5 bg-stone-100/70 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t('spokenSummaryTitle')}</span>
                </h3>
                {isVoiceReadingThisReport && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    Speaking Now
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-800 italic leading-relaxed">
                {isVoiceReadingThisReport ? (
                  diagnosisSentences.map((sentence, idx) => (
                    <span
                      key={idx}
                      className={`transition-all duration-150 ${
                        currentSentenceIndex === idx
                          ? 'bg-amber-200 text-stone-950 px-1 py-0.5 rounded-sm font-semibold not-italic shadow-2xs'
                          : ''
                      }`}
                    >
                      {sentence}{' '}
                    </span>
                  ))
                ) : (
                  `"${textToRead}"`
                )}
              </p>
            </div>
          )}

          {/* Source Attribution per §9 */}
          <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
            <div>
              <strong>{t('sourceAttribution')}:</strong> Kisan Multimodal Leaf Pathology Engine (Gemini)
            </div>
            <div className="text-stone-400 italic text-[11px]">
              {t('aiDisclaimer')}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
