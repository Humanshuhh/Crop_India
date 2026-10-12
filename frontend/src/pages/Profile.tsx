import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  MapPin,
  Trees,
  Compass,
  FileText,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Info,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Layers,
  Phone,
  Hash,
  X,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FarmerProfile } from '../types/profile.types';
import indiaLocations from '../data/indiaLocations.json';
import {
  saveFarmerProfileToDb,
  getFarmerProfileFromDb,
  type FarmerDbRecord,
} from '../services/farmer';

const COMMON_CROPS = [
  'Wheat',
  'Rice (Paddy)',
  'Cotton',
  'Mustard',
  'Soybean',
  'Maize',
  'Sugarcane',
  'Gram (Chana)',
  'Potato',
  'Vegetables',
];

const AGRO_CLIMATIC_ZONES = [
  'Western Himalayan Region',
  'Eastern Himalayan Region',
  'Lower Gangetic Plains',
  'Middle Gangetic Plains',
  'Upper Gangetic Plains',
  'Trans-Gangetic Plains',
  'Eastern Plateau & Hills',
  'Central Plateau & Hills',
  'Western Plateau & Hills',
  'Southern Plateau & Hills',
  'East Coast Plains & Hills',
  'West Coast Plains & Ghats',
  'Gujarat Plains & Hills',
  'Western Dry Region',
  'The Islands',
];

const INDIAN_STATES_AND_UTS = indiaLocations.states
  .map((state) => state.name)
  .sort((a, b) => a.localeCompare(b));

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newCropInput, setNewCropInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const storageKey = user ? `kisan_farmer_profile_${user.uid}` : '';

  const getInitialProfile = (): FarmerProfile => {
    return {
      fullName: user?.name || '',
      phone: user?.phone || '',
      email: '',
      farmerId: user ? user.uid : '',
      village: '',
      district: '',
      state: '',
      latitude: '',
      longitude: '',
      landArea: '',
      landUnit: 'acres',
      primaryCrops: '',
      agroClimaticZone: undefined,
      updatedAt: new Date().toISOString(),
    };
  };

  const [profile, setProfile] = useState<FarmerProfile>(getInitialProfile);
  const [formData, setFormData] = useState<FarmerProfile>(getInitialProfile);
  const [districtIsCustom, setDistrictIsCustom] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [showDistrictOptions, setShowDistrictOptions] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [showStateOptions, setShowStateOptions] = useState(false);

  // Load profile from localStorage whenever user changes
  useEffect(() => {
    if (!user || !storageKey) return;

    let currentFarmerId = '';
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as FarmerProfile;
        parsed.phone = user.phone || parsed.phone || '';
        parsed.farmerId = user.uid;
        currentFarmerId = parsed.farmerId;
        setProfile(parsed);
        setFormData(parsed);
      } else {
        const initial = getInitialProfile();
        currentFarmerId = initial.farmerId || '';
        setProfile(initial);
        setFormData(initial);
      }
    } catch {
      const fallback = getInitialProfile();
      currentFarmerId = fallback.farmerId || '';
      setProfile(fallback);
      setFormData(fallback);
    }

    // Connect to GET /db/farmer/{farmer_id}
    if (currentFarmerId) {
      getFarmerProfileFromDb(currentFarmerId)
        .then((cloudData) => {
          if (cloudData && cloudData.name) {
            setProfile((prev) => {
              const merged: FarmerProfile = {
                ...prev,
                fullName: cloudData.name || prev.fullName,
                phone: cloudData.phone || prev.phone,
                state: cloudData.state || prev.state,
                district: cloudData.district || prev.district,
              };
              localStorage.setItem(storageKey, JSON.stringify(merged));
              return merged;
            });
            setFormData((prev) => ({
              ...prev,
              fullName: cloudData.name || prev.fullName,
              phone: cloudData.phone || prev.phone,
              state: cloudData.state || prev.state,
              district: cloudData.district || prev.district,
            }));
          }
        })
        .catch(() => {
        // Keep the locally saved profile if cloud data is unavailable.
      });
    }
  }, [user, storageKey]);

  // Handle unauthenticated state
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
              {t('profileTitle')}
            </h1>
            <p className="text-stone-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              {t('profileLoginPrompt')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/login"
              state={{ from: { pathname: '/profile' } }}
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{t('profileLoginBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/signup"
              state={{ from: { pathname: '/profile' } }}
              className="w-full sm:w-auto px-6 py-3 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold text-sm transition-colors flex items-center justify-center"
            >
              <span>{t('navSignup')}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // GPS Device Detection
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lon = position.coords.longitude.toFixed(5);
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
        }));
        setGpsLoading(false);
      },
      (error) => {
        let msg = 'Unable to determine device location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser or enter coordinates manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location signals are currently unavailable. Please enter coordinates manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Crops parsing helper
  const formCropsList = formData.primaryCrops
    ? formData.primaryCrops.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  const profileCropsList = profile.primaryCrops
    ? profile.primaryCrops.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  // Add a crop tag
  const handleAddCrop = (crop: string) => {
    const trimmed = crop.trim();
    if (!trimmed) return;
    if (formCropsList.includes(trimmed)) return;
    const updated = [...formCropsList, trimmed].join(', ');
    setFormData((prev) => ({
      ...prev,
      primaryCrops: updated,
    }));
    setNewCropInput('');
  };

  // Remove a crop tag
  const handleRemoveCrop = (cropToRemove: string) => {
    const updated = formCropsList.filter((c) => c !== cropToRemove).join(', ');
    setFormData((prev) => ({
      ...prev,
      primaryCrops: updated,
    }));
  };

  // Validate form
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Text fields: allow letters, spaces, periods, apostrophes and hyphens.
    // Supports Indian-language letters as well as English.
    const textFields = [
      { key: 'fullName', value: formData.fullName, label: 'Farmer name' },
      { key: 'district', value: formData.district, label: 'District' },
      { key: 'state', value: formData.state, label: 'State' },
    ] as const;

    for (const field of textFields) {
      const village = formData.village.trim();

      if (
        village &&
        !/^[\p{L}\p{M}\p{N}\s.,'’/#()\-]+$/u.test(village)
      ) {
        errors.village =
          'Village/town may contain letters, numbers, spaces, and common punctuation only.';
      }

      const value = field.value.trim();

      if (value && !/^[\p{L}\p{M}\s.'’-]+$/u.test(value)) {
        errors[field.key] =
          `${field.label} should contain letters only, without numbers or special symbols.`;
      }
    }

    // Land area: accept only a non-negative decimal number.
    const area = formData.landArea.trim();
    if (area !== '') {
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(area) || Number(area) < 0) {
        errors.landArea =
          'Land holding area must be a non-negative number (0 or greater).';
      }
    }

    // Latitude: accept only a number between -90 and 90.
    const latitude = formData.latitude.trim();
    if (latitude !== '') {
      if (
        !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(latitude) ||
        Number(latitude) < -90 ||
        Number(latitude) > 90
      ) {
        errors.latitude = 'Latitude must be between -90° and 90°.';
      }
    }

    // Longitude: accept only a number between -180 and 180.
    const longitude = formData.longitude.trim();
    if (longitude !== '') {
      if (
        !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(longitude) ||
        Number(longitude) < -180 ||
        Number(longitude) > 180
      ) {
        errors.longitude = 'Longitude must be between -180° and 180°.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };


  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const updated: FarmerProfile = {
      ...formData,
      updatedAt: new Date().toISOString(),
    };

    // 1. Always persist to localStorage first for local-first reliability
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setProfile(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch {
      setValidationErrors({ general: 'Failed to write profile to local storage. Storage quota may be full.' });
      return;
    }

    // 2. Wire to POST /db/farmer -> Firestore

    if (user) {
      const payload: FarmerDbRecord = {
        farmer_id: updated.farmerId || user.uid,
        name: updated.fullName.trim() || 'Kisan',
        phone: (user?.phone || updated.phone).trim() || '',
        state: updated.state.trim() || '',
        district: updated.district.trim() || '',
        language: language || 'en',
        village: updated.village.trim() || undefined,
        latitude: updated.latitude ? parseFloat(updated.latitude) : undefined,
        longitude: updated.longitude ? parseFloat(updated.longitude) : undefined,
        land_area: updated.landArea ? parseFloat(updated.landArea) : undefined,
        primary_crops: updated.primaryCrops || undefined,
        agro_climatic_zone: updated.agroClimaticZone || undefined,
      };

      try {
        const res = await saveFarmerProfileToDb(payload);

        if (!res || res.status !== 'success') {
          console.warn('Profile cloud sync did not report success.', res);
        }
      } catch (err) {
        console.error('Profile cloud synchronization failed:', err);
      }
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setValidationErrors({});
    setGpsError(null);
    setIsEditing(false);
  };
    const filteredStates = INDIAN_STATES_AND_UTS.filter((state) =>
    state.toLowerCase().includes(stateSearch.trim().toLowerCase())
  );

    const selectedLocation = indiaLocations.states.find(
    (state) => state.name === formData.state
  );

  const districtOptions = [...(selectedLocation?.districts ?? [])].sort(
    (a, b) => a.localeCompare(b)
  );

  const filteredDistricts = districtOptions.filter((district) =>
    district.toLowerCase().includes(districtSearch.trim().toLowerCase())
  );

  const showCustomDistrictInput =
    districtIsCustom ||
    Boolean(
      formData.district &&
      !districtOptions.includes(formData.district)
    );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <User className="w-3.5 h-3.5" />
            <span>Kisan Sahayak</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
            {t('profileTitle')}
          </h1>
          <p className="text-stone-600 text-sm sm:text-base">
            {t('profileSubtitle')}
          </p>
        </div>

        <div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                setFormData(profile);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm shadow-xs transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>{t('editProfileBtn')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Save className="w-4 h-4" />
                <span>{t('saveProfileBtn')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 flex items-center gap-3 text-green-900 text-sm shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span>Profile saved successfully on this device!</span>
        </div>
      )}

      {/* General error if any */}
      {validationErrors.general && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-center gap-3 text-red-900 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{validationErrors.general}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Identity, Location, Land Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Farmer Identity */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <User className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                {t('farmerInfoTitle')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  {t('fullNameLabel')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900"
                  />
                ) : (
                  <div className="text-stone-900 font-medium text-base py-1">
                    {profile.fullName || <span className="text-stone-400 italic">Not specified</span>}
                  </div>
                )}
              </div>

              {/* Phone / WhatsApp */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{t('phoneLabel')}</span>
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="tel"
                      value={user?.phone || formData.phone}
                      readOnly
                      aria-readonly="true"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-stone-100 text-stone-600 cursor-not-allowed text-sm"
                    />
                    {validationErrors.phone && (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.phone}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-stone-900 font-medium text-base py-1">
                    {profile.phone || <span className="text-stone-400 italic">Not provided</span>}
                  </div>
                )}
              </div>

              {/* Farmer ID (Deterministic from UID) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-stone-400" />
                  <span>{t('farmerIdLabel')}</span>
                </label>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-stone-100 border border-stone-200 font-mono text-xs font-bold text-stone-800">
                  <span>{profile.farmerId || user.uid}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Farm Location & Coordinates */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  {t('farmLocationTitle')}
                </h2>
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {gpsLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  <span>{gpsLoading ? 'Detecting...' : 'Auto-Detect via GPS'}</span>
                </button>
              )}
            </div>

            {gpsError && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Village */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  {t('villageLabel')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    placeholder="e.g. Rampur"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900"
                  />
                ) : (
                  <div className="text-stone-900 font-medium text-base py-1">
                    {profile.village || <span className="text-stone-400 italic">Not set</span>}
                  </div>
                )}
              </div>

              {/* District */}
              <div className="space-y-1.5">
                <label
                  htmlFor="district-search"
                  className="block text-xs font-semibold text-stone-600 uppercase tracking-wider"
                >
                  {t('districtLabel')}
                </label>

                {isEditing ? (
                  showCustomDistrictInput ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            district: e.target.value,
                          }))
                        }
                        placeholder="Enter district name"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setDistrictIsCustom(false);
                          setFormData((prev) => ({
                            ...prev,
                            district: '',
                          }));
                          setDistrictSearch('');
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                      >
                        Choose from district list
                      </button>
                    </div>
                  ) : (
                    <div
                      className="relative"
                      onBlur={(event) => {
                        if (
                          !event.currentTarget.contains(
                            event.relatedTarget as Node | null
                          )
                        ) {
                          setShowDistrictOptions(false);
                          setDistrictSearch('');
                        }
                      }}
                    >
                      <input
                        id="district-search"
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={showDistrictOptions}
                        aria-controls="district-options-list"
                        autoComplete="off"
                        disabled={!formData.state}
                        value={
                          showDistrictOptions
                            ? districtSearch
                            : formData.district
                        }
                        placeholder={
                          formData.state
                            ? 'Search or select district'
                            : 'Select state first'
                        }
                        onFocus={() => {
                          setDistrictSearch('');
                          setShowDistrictOptions(true);
                        }}
                        onChange={(event) => {
                          setDistrictSearch(event.target.value);
                          setShowDistrictOptions(true);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            setShowDistrictOptions(false);
                            setDistrictSearch('');
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 disabled:bg-stone-100 disabled:text-stone-400"
                      />

                      {showDistrictOptions && formData.state && (
                        <div
                          id="district-options-list"
                          role="listbox"
                          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg"
                        >
                          {filteredDistricts.length > 0 ? (
                            filteredDistricts.map((district) => (
                              <button
                                key={district}
                                type="button"
                                role="option"
                                aria-selected={
                                  formData.district === district
                                }
                                onMouseDown={(event) =>
                                  event.preventDefault()
                                }
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    district,
                                  }));
                                  setDistrictIsCustom(false);
                                  setDistrictSearch('');
                                  setShowDistrictOptions(false);
                                }}
                                className={`block w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-emerald-50 ${
                                  formData.district === district
                                    ? 'bg-emerald-50 font-semibold text-emerald-800'
                                    : 'text-stone-800'
                                }`}
                              >
                                {district}
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-3 text-sm text-stone-500">
                              No matching district found.
                            </p>
                          )}

                          <button
                            type="button"
                            onMouseDown={(event) =>
                              event.preventDefault()
                            }
                            onClick={() => {
                              setDistrictIsCustom(true);
                              setFormData((prev) => ({
                                ...prev,
                                district: '',
                              }));
                              setDistrictSearch('');
                              setShowDistrictOptions(false);
                            }}
                            className="mt-1 block w-full rounded-md border-t border-stone-200 px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Other / Not listed
                          </button>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-stone-900 font-medium text-base py-1">
                    {profile.district || (
                      <span className="text-stone-400 italic">
                        Not set
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <label
                  htmlFor="state-search"
                  className="block text-xs font-semibold text-stone-600 uppercase tracking-wider"
                >
                  {t('stateLabel')}
                </label>

                {isEditing ? (
                  <div
                    className="relative"
                    onBlur={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node | null
                        )
                      ) {
                        setShowStateOptions(false);
                      }
                    }}
                  >
                    <input
                      id="state-search"
                      type="text"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={showStateOptions}
                      aria-controls="state-options-list"
                      autoComplete="off"
                      value={showStateOptions ? stateSearch : formData.state}
                      placeholder="Search or select state / UT"
                      onFocus={() => {
                        setStateSearch(formData.state);
                        setShowStateOptions(true);
                      }}
                      onChange={(event) => {
                        setStateSearch(event.target.value);
                        setShowStateOptions(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          setShowStateOptions(false);
                          setStateSearch(formData.state);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900"
                    />

                    {showStateOptions && (
                      <div
                        id="state-options-list"
                        role="listbox"
                        className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg"
                      >
                        {filteredStates.length > 0 ? (
                          filteredStates.map((state) => (
                            <button
                              key={state}
                              type="button"
                              role="option"
                              aria-selected={formData.state === state}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  state,
                                  district: '',
                                }));
                                setDistrictIsCustom(false);
                                setStateSearch(state);
                                setShowStateOptions(false);
                              }}
                              className={`block w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-emerald-50 ${
                                formData.state === state
                                  ? 'bg-emerald-50 font-semibold text-emerald-800'
                                  : 'text-stone-800'
                              }`}
                            >
                              {state}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-3 text-sm text-stone-500">
                            No matching state or UT found.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-stone-900 font-medium text-base py-1">
                    {profile.state || (
                      <span className="text-stone-400 italic">
                        Not set
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-stone-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  Latitude (°N)
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          latitude: e.target.value,
                        })
                      }
                      placeholder="e.g. 25.31760"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 font-mono"
                    />
                    {validationErrors.latitude && (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.latitude}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-stone-900 font-mono text-sm py-1">
                    {profile.latitude ? `${profile.latitude}° N` : <span className="text-stone-400 italic font-sans">Not set</span>}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  Longitude (°E)
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          longitude: e.target.value,
                        })
                      }
                      placeholder="e.g. 82.97390"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 font-mono"
                    />
                    {validationErrors.longitude && (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.longitude}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-stone-900 font-mono text-sm py-1">
                    {profile.longitude ? `${profile.longitude}° E` : <span className="text-stone-400 italic font-sans">Not set</span>}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Farm Land & Crops */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Trees className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                {t('farmDetailsTitle')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Land Holding Area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  {t('landAreaLabel')}
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.landArea}
                      onChange={(e) =>
                        setFormData({ ...formData, landArea: e.target.value })
                      }
                      placeholder="e.g. 2.5"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900"
                    />
                    {validationErrors.landArea && (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.landArea}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-stone-900 font-bold text-lg py-1">
                    {profile.landArea || '0'}{' '}
                    <span className="text-sm font-medium text-stone-600">{profile.landUnit}</span>
                  </div>
                )}
              </div>

              {/* Land Unit */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  {t('landUnitLabel')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.landUnit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        landUnit: e.target.value as 'acres' | 'hectares',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 bg-white"
                  >
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                  </select>
                ) : (
                  <div className="text-stone-800 font-medium text-base py-1 capitalize">
                    {profile.landUnit}
                  </div>
                )}
              </div>
            </div>

            {/* Primary Crops */}
            <div className="space-y-2 pt-3 border-t border-stone-100">
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                {t('primaryCropsLabel')}
              </label>

              {isEditing ? (
                <div className="space-y-3">
                  {/* Selected Crop Badges */}
                  <div className="flex flex-wrap gap-2 min-h-8">
                    {formCropsList.length === 0 ? (
                      <span className="text-xs text-stone-400 italic">No crops selected yet. Choose from quick options below or add custom crops.</span>
                    ) : (
                      formCropsList.map((crop) => (
                        <span
                          key={crop}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold"
                        >
                          <span>{crop}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCrop(crop)}
                            className="p-0.5 hover:text-red-600 focus:outline-none"
                            aria-label={`Remove ${crop}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Add Custom Crop Input */}
                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="text"
                      value={newCropInput}
                      onChange={(e) => setNewCropInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCrop(newCropInput);
                        }
                      }}
                      placeholder="Add another crop..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCrop(newCropInput)}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase">Quick Select:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_CROPS.map((crop) => {
                        const isSelected = formCropsList.includes(crop);
                        return (
                          <button
                            key={crop}
                            type="button"
                            onClick={() => (isSelected ? handleRemoveCrop(crop) : handleAddCrop(crop))}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                              isSelected
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {isSelected ? `✓ ${crop}` : `+ ${crop}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 py-1">
                  {profileCropsList.length > 0 ? (
                    profileCropsList.map((crop) => (
                      <span
                        key={crop}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold"
                      >
                        {crop}
                      </span>
                    ))
                  ) : (
                    <span className="text-stone-400 text-sm italic">No crops recorded yet.</span>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right 1 Column: Agro-Climatic Zone & Field Records */}
        <div className="space-y-8">
          {/* Section 4: Agro-Climatic Zone (Honest Empty State) */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Compass className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                {t('agroClimaticZoneTitle')}
              </h2>
            </div>

            <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" />
                <span>Zone Classification</span>
              </div>
              {isEditing ? (
                <div className="space-y-1">
                  <select
                    value={formData.agroClimaticZone || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        agroClimaticZone: e.target.value || undefined,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-stone-900 bg-white"
                  >
                    <option value="">-- Select Agro-Climatic Zone --</option>
                    {AGRO_CLIMATIC_ZONES.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-stone-800 font-medium leading-relaxed">
                  {profile.agroClimaticZone || t('agroClimaticZonePending')}
                </p>
              )}
              <div className="pt-1">
                <Link
                  to="/khet-swasthya"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-500/40"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Run Soil Health Evaluation &rarr;</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Section 5: Field Records & History (Honest Pending State) */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  {t('recordsSectionTitle')}
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-600">
                {t('profileHistoryStatusBadge')}
              </span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {t('recordsPendingNote')}
            </p>

            <div className="space-y-3 pt-2">
              {/* Soil Evaluation Record Placeholder */}
              <div className="rounded-lg border border-dashed border-stone-300 p-3.5 text-center space-y-1 bg-stone-50/50">
                <div className="text-xs font-semibold text-stone-700">
                  Soil Health Card Evaluations
                </div>
                <p className="text-[11px] text-stone-500">
                  0 saved cloud evaluations. Evaluations run on the Khet Swasthya page are stored in local session memory.
                </p>
              </div>

              {/* Plant Diagnosis Record Placeholder */}
              <div className="rounded-lg border border-dashed border-stone-300 p-3.5 text-center space-y-1 bg-stone-50/50">
                <div className="text-xs font-semibold text-stone-700">
                  Crop Pathology Diagnoses
                </div>
                <p className="text-[11px] text-stone-500">
                  0 saved cloud diagnoses. Leaf scans run on the Fasal Rog Pehchan page are processed live and not persisted without a backend history database.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <Link
                to="/history"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>View Full History Timeline &rarr;</span>
              </Link>
              <Link
                to="/data-sources"
                className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Governance</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

