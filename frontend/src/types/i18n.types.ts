export type SupportedLanguage = 'en' | 'hi' | 'bn' | 'te' | 'ta' | 'mr';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  voiceLangCode: string;
}

export interface TranslationDictionary {
  // Navigation & Common
  appTitle: string;
  appSubtitle: string;
  navHome: string;
  navKhetSwasthya: string;
  navFasalRog: string;
  navTelemetry: string;
  navDataSources: string;
  navLogin: string;
  navSignup: string;
  navLogout: string;
  navProfile: string;
  optionalTag: string;
  navOpen: string;

  // Language & Voice
  languageSelectAria: string;
  voiceReadAloud: string;
  voiceStop: string;
  voiceSpeaking: string;
  voiceNotAvailable: string;
  aiEnglishOnlyNotice: string;

  // Status & Actions
  loading: string;
  error: string;
  submit: string;
  cancel: string;
  retry: string;
  pendingIntegrationTitle: string;
  pendingIntegrationSubtitle: string;
  sourceAttribution: string;
  lastUpdated: string;
  aiDisclaimer: string;

  // Home Page
  heroTitle: string;
  heroTagline: string;
  heroDescription: string;
  heroCtaKhet: string;
  heroCtaFasal: string;
  coreValuesTitle: string;
  zeroFakeDataTitle: string;
  zeroFakeDataDesc: string;
  accessibilityTitle: string;
  accessibilityDesc: string;
  transparencyTitle: string;
  transparencyDesc: string;
  exploreFeaturesTitle: string;

  // Khet Swasthya Page
  khetTitle: string;
  khetSubtitle: string;
  locationSectionTitle: string;
  locationHelp: string;
  useMyLocationBtn: string;
  locationFetching: string;
  latitudeLabel: string;
  longitudeLabel: string;
  shcSectionTitle: string;
  shcHelp: string;
  phLabel: string;
  socLabel: string;
  nLabel: string;
  pLabel: string;
  kLabel: string;
  znLabel: string;
  evaluateSoilBtn: string;
  evaluatingSoil: string;
  weatherSectionTitle: string;
  weatherPendingDesc: string;
  ndviSectionTitle: string;
  ndviPendingDesc: string;
  soilResultTitle: string;
  criticallyDegradedWarning: string;
  zoneLabel: string;
  biologicalAmendmentsTitle: string;
  cropRotationTitle: string;
  sowingWindowAdviceTitle: string;
  spokenAdvisoryTitle: string;

  // Fasal Rog Pehchan Page
  fasalTitle: string;
  fasalSubtitle: string;
  uploadSectionTitle: string;
  uploadHelp: string;
  cameraBtn: string;
  uploadBtn: string;
  dragDropText: string;
  fileLimitText: string;
  imagePreviewTitle: string;
  removeImageBtn: string;
  diagnoseBtn: string;
  diagnosingProgress: string;
  diagnosisPendingNote: string;
  diagnosisResultTitle: string;
  plantDetected: string;
  noPlantDetected: string;
  conditionLabel: string;
  confidenceLabel: string;
  symptomsTitle: string;
  causeTitle: string;
  ecoRemediesTitle: string;
  culturalPracticesTitle: string;
  spokenSummaryTitle: string;

  // Kisaan Telemetry Page
  telemetryTitle: string;
  telemetrySubtitle: string;
  telemetryPendingBadge: string;
  telemetryPendingDesc: string;
  agroClimaticMapTitle: string;
  sentinelNdviMapTitle: string;

  // Data Sources Page
  dataSourcesTitle: string;
  dataSourcesSubtitle: string;
  integratedSourcesTitle: string;
  pendingSourcesTitle: string;
  aiGovernanceTitle: string;
  aiGovernanceNotice: string;

  // Profile / My Farm Page
  profileTitle: string;
  profileSubtitle: string;
  farmerInfoTitle: string;
  fullNameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  farmerIdLabel: string;
  farmLocationTitle: string;
  villageLabel: string;
  districtLabel: string;
  stateLabel: string;
  farmDetailsTitle: string;
  landAreaLabel: string;
  landUnitLabel: string;
  primaryCropsLabel: string;
  agroClimaticZoneTitle: string;
  agroClimaticZonePending: string;
  recordsSectionTitle: string;
  recordsPendingNote: string;
  editProfileBtn: string;
  saveProfileBtn: string;
  profileSavedNotice: string;
  profileLoginPrompt: string;
  profileLoginBtn: string;

  // Authentication & Validation
  authEmailInUse: string;
  authInvalidEmail: string;
  authWeakPassword: string;
  authInvalidCredential: string;
  authUserNotFound: string;
  authWrongPassword: string;
  authTooManyRequests: string;
  authNetworkFailed: string;
  authOperationNotAllowed: string;
  authConfigError: string;
  authGenericError: string;
  authPasswordMismatch: string;
  authPasswordLength: string;
  showPassword: string;
  hidePassword: string;
  // Onboarding / Welcome Screen
  welcomeGreeting: string;
  welcomeSubtitle: string;
  welcomeSelectLanguage: string;
  welcomeContinueBtn: string;
  welcomeLoginBtn: string;
  welcomeSignupBtn: string;

  // Navbar — missing keys
  navKisanMitra: string;
  navHistory: string;
appTagline: string;

  adminNav: string;
adminDashboardTitle: string;
adminDashboardNoData: string;
accessDenied: string;


  // Footer
  footerBrandDesc: string;
  footerDataTransparency: string;
  footerNoSyntheticData: string;
  footerSeparateAI: string;
  footerAdvisoryCharter: string;
  footerKVKAdvice: string;
  footerCopyright: string;
  footerMethodology: string;
  footerSoilAdvisory: string;
  footerLeafDiagnostics: string;

  // Home page — hardcoded strings
  homeDigitalPublicGood: string;
  homeAskKisanMitra: string;
  homeCoreValuesSubtitle: string;
  homeFeatureSubtitle: string;
  homeBadgeLiveAdvisory: string;
  homeKhetDesc: string;
  homeKhetFeature1: string;
  homeKhetFeature2: string;
  homeKhetFeature3: string;
  homeBadgeLeafAPI: string;
  homeFasalDesc: string;
  homeFasalFeature1: string;
  homeFasalFeature2: string;
  homeFasalFeature3: string;
  homeKisanMitraTitle: string;
  homeBadgeVoiceVision: string;
  homeKisanMitraDesc: string;
  homeKisanMitraFeature1: string;
  homeKisanMitraFeature2: string;
  homeKisanMitraFeature3: string;
  homeBadgeTelemetry: string;
  homeTelemetryCardTitle: string;
  homeTelemetryDesc: string;
  homeTelemetryFeature1: string;
  homeTelemetryFeature2: string;
  homeTelemetryFeature3: string;
  homeInspectTelemetry: string;
  homeBadgeHistory: string;
  homeHistoryTitle: string;
  homeHistoryDesc: string;
  homeHistoryFeature1: string;
  homeHistoryFeature2: string;
  homeHistoryFeature3: string;
  homeViewHistory: string;
  homeConsultKisanMitra: string;

  // Login page
  loginSubtitle: string;
  loginEmailLabel: string;
  loginPasswordLabel: string;
  loginVerifying: string;
  loginNoAccount: string;
  loginSignupHere: string;

  // Signup page
  signupTitle: string;
  signupSubtitle: string;
  signupEmailLabel: string;
  signupCreatePasswordLabel: string;
  signupPasswordPlaceholder: string;
  signupConfirmPasswordLabel: string;
  signupConfirmPlaceholder: string;
  signupCreating: string;
  signupCreateBtn: string;
  signupHaveAccount: string;
  signupLoginHere: string;

  // Phase 3 — Farmer-First Dashboard & Advisory UX
  farmerGreeting: string;
  farmerHelpQuestion: string;
  farmContextTitle: string;
  noFarmProfile: string;
  setupFarmAction: string;
  locationLabel: string;
  activeAdvisoryTitle: string;
  noActiveWarning: string;
  actionFasalTitle: string;
  actionFasalDesc: string;
  actionKhetTitle: string;
  actionKhetDesc: string;
  actionMitraTitle: string;
  actionMitraDesc: string;
  actionTelemetryTitle: string;
  actionTelemetryDesc: string;
  recentActivityTitle: string;
  noRecentActivity: string;
  viewAllHistory: string;
  supportHelp: string;
  advisorySectionHeader: string;
  advisoryImmediateAction: string;
  advisoryWhyTitle: string;
  advisoryTechnicalDetails: string;
  bottomNavHome: string;
  bottomNavFasal: string;
  bottomNavKhet: string;
  bottomNavMitra: string;
  bottomNavHistory: string;
}

