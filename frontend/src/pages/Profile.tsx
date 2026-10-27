import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  MapPin,
  Trees,
  Compass,
  FileText,
  Save,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Navigation,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Layers,
  Phone,
  Hash,
  X,
  Plus,
  Camera,
  RotateCcw,
  Sparkles,
  LogOut,
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
import { reverseGeocode } from '../services/geocoding';

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

/**
 * Safely compresses and resizes a user-selected profile image to a compact JPEG data URL (max 256x256).
 * This keeps the base64 string small (~15-25 KB), preventing localStorage QuotaExceededError
 * and ensuring instantaneous persistence across page reloads and routes.
 */
function processProfileImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.onload = () => {
        try {
          const maxDim = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(reader.result as string);
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressedDataUrl);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const Profile: React.FC = () => {
  const { user, updateUserName, updateUserAvatar, signOutUser } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccessMsg, setGpsSuccessMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCropInput, setNewCropInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [customCityMode, setCustomCityMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const storageKey = user ? `kisan_farmer_profile_${user.uid}` : '';

  const getInitialProfile = (): FarmerProfile => {
    const storedAvatar =
      user?.avatarUrl ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('kisan_avatar') : null) ||
      '';

    return {
      fullName: user?.name || '',
      phone: user?.phone || '',
      email: '',
      farmerId: user ? user.uid : '',
      avatarUrl: storedAvatar,
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

  // Load profile from localStorage whenever user changes and merge with remote database
  useEffect(() => {
    if (!user || !storageKey) return;

    let currentFarmerId = '';
    let localProfile: FarmerProfile | null = null;
    const storedAvatar =
      user.avatarUrl ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('kisan_avatar') : null) ||
      '';

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        localProfile = JSON.parse(saved) as FarmerProfile;
        localProfile.phone = user.phone || localProfile.phone || '';
        localProfile.farmerId = user.uid;

        // Ensure avatarUrl is populated from stored avatar if missing
        if (!localProfile.avatarUrl && storedAvatar) {
          localProfile.avatarUrl = storedAvatar;
        }
        if (localProfile.avatarUrl && !user.avatarUrl) {
          updateUserAvatar(localProfile.avatarUrl);
        }

        currentFarmerId = localProfile.farmerId;
        setProfile(localProfile);
        setFormData(localProfile);
      } else {
        const initial = getInitialProfile();
        if (storedAvatar) {
          initial.avatarUrl = storedAvatar;
        }
        currentFarmerId = initial.farmerId || '';
        setProfile(initial);
        setFormData(initial);
      }
    } catch {
      const fallback = getInitialProfile();
      if (storedAvatar) {
        fallback.avatarUrl = storedAvatar;
      }
      currentFarmerId = fallback.farmerId || '';
      setProfile(fallback);
      setFormData(fallback);
    }

    // Connect to GET /api/v1/farmer/{farmer_id}
    if (currentFarmerId) {
      getFarmerProfileFromDb(currentFarmerId)
        .then((cloudData) => {
          if (cloudData && cloudData.name) {
            setProfile((prev) => {
              const effectiveAvatar =
                prev.avatarUrl ||
                localProfile?.avatarUrl ||
                user?.avatarUrl ||
                (typeof localStorage !== 'undefined' ? localStorage.getItem('kisan_avatar') : null) ||
                '';

              const merged: FarmerProfile = {
                fullName: cloudData.name || localProfile?.fullName || prev.fullName,
                phone: cloudData.phone || localProfile?.phone || prev.phone,
                email: localProfile?.email || prev.email,
                farmerId: cloudData.farmer_id || localProfile?.farmerId || prev.farmerId,
                avatarUrl: effectiveAvatar,
                village: cloudData.village || cloudData.district || localProfile?.village || prev.village,
                district: cloudData.district || localProfile?.district || prev.district,
                state: cloudData.state || localProfile?.state || prev.state,
                latitude: (cloudData.latitude !== undefined && cloudData.latitude !== null)
                  ? String(cloudData.latitude)
                  : (localProfile?.latitude ?? prev.latitude),
                longitude: (cloudData.longitude !== undefined && cloudData.longitude !== null)
                  ? String(cloudData.longitude)
                  : (localProfile?.longitude ?? prev.longitude),
                landArea: (cloudData.land_area !== undefined && cloudData.land_area !== null)
                  ? String(cloudData.land_area)
                  : (localProfile?.landArea ?? prev.landArea),
                landUnit: localProfile?.landUnit || prev.landUnit || 'acres',
                primaryCrops: (cloudData.primary_crops !== undefined && cloudData.primary_crops !== null)
                  ? cloudData.primary_crops
                  : (localProfile?.primaryCrops ?? prev.primaryCrops),
                agroClimaticZone: cloudData.agro_climatic_zone || localProfile?.agroClimaticZone || prev.agroClimaticZone,
                updatedAt: localProfile?.updatedAt || new Date().toISOString(),
              };

              try {
                localStorage.setItem(storageKey, JSON.stringify(merged));
                if (effectiveAvatar) {
                  localStorage.setItem('kisan_avatar', effectiveAvatar);
                }
              } catch {}

              return merged;
            });

            // Only update formData if not currently in edit mode to avoid clobbering active edits
            if (!isEditingRef.current) {
              setFormData((prev) => {
                const effectiveAvatar =
                  prev.avatarUrl ||
                  localProfile?.avatarUrl ||
                  user?.avatarUrl ||
                  (typeof localStorage !== 'undefined' ? localStorage.getItem('kisan_avatar') : null) ||
                  '';

                return {
                  ...prev,
                  fullName: cloudData.name || localProfile?.fullName || prev.fullName,
                  phone: cloudData.phone || localProfile?.phone || prev.phone,
                  avatarUrl: effectiveAvatar,
                  state: cloudData.state || localProfile?.state || prev.state,
                  district: cloudData.district || localProfile?.district || prev.district,
                  village: cloudData.village || cloudData.district || localProfile?.village || prev.village,
                  latitude: (cloudData.latitude !== undefined && cloudData.latitude !== null)
                    ? String(cloudData.latitude)
                    : (localProfile?.latitude ?? prev.latitude),
                  longitude: (cloudData.longitude !== undefined && cloudData.longitude !== null)
                    ? String(cloudData.longitude)
                    : (localProfile?.longitude ?? prev.longitude),
                  landArea: (cloudData.land_area !== undefined && cloudData.land_area !== null)
                    ? String(cloudData.land_area)
                    : (localProfile?.landArea ?? prev.landArea),
                  landUnit: localProfile?.landUnit || prev.landUnit || 'acres',
                  primaryCrops: (cloudData.primary_crops !== undefined && cloudData.primary_crops !== null)
                    ? cloudData.primary_crops
                    : (localProfile?.primaryCrops ?? prev.primaryCrops),
                  agroClimaticZone: cloudData.agro_climatic_zone || localProfile?.agroClimaticZone || prev.agroClimaticZone,
                };
              });
            }
          }
        })
        .catch(() => {
          // Keep local profile if cloud data is unavailable or 404
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

  // Active profile record based on edit state
  const activeRecord = isEditing ? formData : profile;

  // Districts for selected state
  const selectedStateObj = indiaLocations.states.find(
    (s) => s.name === activeRecord.state
  );
  const stateDistricts = selectedStateObj
    ? [...selectedStateObj.districts].sort((a, b) => a.localeCompare(b))
    : [];

  // Unified updater for individual form fields to prevent stale closure overwrites
  const updateFormField = <K extends keyof FarmerProfile>(field: K, value: FarmerProfile[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'district' ? { village: value as string } : {}),
    }));
  };

  // GPS Device Detection + Reverse Geocoding
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setGpsSuccessMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const latStr = lat.toFixed(5);
        const lonStr = lon.toFixed(5);

        try {
          const geo = await reverseGeocode(lat, lon);
          setFormData((prev) => ({
            ...prev,
            latitude: latStr,
            longitude: lonStr,
            state: geo?.state || prev.state,
            district: geo?.city || prev.district,
            village: geo?.city || prev.district,
          }));
          setCustomCityMode(false);
          if (geo?.city && geo?.state) {
            setGpsSuccessMsg(`Location detected: ${geo.city}, ${geo.state}`);
          } else if (geo?.state) {
            setGpsSuccessMsg(`State detected: ${geo.state} (${latStr}° N, ${lonStr}° E)`);
          } else {
            setGpsSuccessMsg(`Coordinates detected: ${latStr}° N, ${lonStr}° E`);
          }
        } catch (err) {
          console.warn('Reverse geocode error:', err);
          setFormData((prev) => ({
            ...prev,
            latitude: latStr,
            longitude: lonStr,
          }));
          setGpsSuccessMsg(`Coordinates detected: ${latStr}° N, ${lonStr}° E`);
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        let msg = 'Unable to determine device location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or select State and City below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location signals are currently unavailable. Please select State and City manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again or select State and City manually.';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Avatar Upload Handler: compresses image to max 256x256, immediately updates state, Navbar, and persists
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file works
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar image size must be under 5MB.');
      return;
    }

    try {
      const optimizedAvatar = await processProfileImage(file);

      // 1. Immediately update form and profile state
      setFormData((prev) => ({ ...prev, avatarUrl: optimizedAvatar }));
      setProfile((prev) => ({ ...prev, avatarUrl: optimizedAvatar }));

      // 2. Immediately update application-wide avatar in navbar
      updateUserAvatar(optimizedAvatar);

      // 3. Immediately persist to localStorage
      try {
        localStorage.setItem('kisan_avatar', optimizedAvatar);
        if (storageKey) {
          const existingSaved = localStorage.getItem(storageKey);
          if (existingSaved) {
            const parsed = JSON.parse(existingSaved);
            parsed.avatarUrl = optimizedAvatar;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
          }
        }
      } catch (storageErr) {
        console.warn('Failed to persist avatar to localStorage:', storageErr);
      }
    } catch (err: any) {
      console.error('Failed to process avatar image:', err);
      alert(err?.message || 'Could not process the selected image.');
    }
  };

  // Crops parsing helpers
  const formCropsList = formData.primaryCrops
    ? formData.primaryCrops.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  const profileCropsList = profile.primaryCrops
    ? profile.primaryCrops.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  // Add a crop tag using functional state derivation
  const handleAddCrop = (crop: string) => {
    const trimmed = crop.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      const currentList = prev.primaryCrops
        ? prev.primaryCrops.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      if (currentList.includes(trimmed)) return prev;
      return {
        ...prev,
        primaryCrops: [...currentList, trimmed].join(', '),
      };
    });
    setNewCropInput('');
  };

  // Remove a crop tag using functional state derivation
  const handleRemoveCrop = (cropToRemove: string) => {
    setFormData((prev) => {
      const currentList = prev.primaryCrops
        ? prev.primaryCrops.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      const updated = currentList.filter((c) => c !== cropToRemove).join(', ');
      return {
        ...prev,
        primaryCrops: updated,
      };
    });
  };

  // Handle State Dropdown Change
  const handleStateChange = (newState: string) => {
    setFormData((prev) => ({
      ...prev,
      state: newState,
      district: '',
      village: '',
    }));
    setCustomCityMode(false);
  };

  // Handle City / Town Dropdown Change
  const handleCitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setCustomCityMode(true);
      setFormData((prev) => ({ ...prev, district: '', village: '' }));
    } else {
      setFormData((prev) => ({
        ...prev,
        district: val,
        village: val,
      }));
    }
  };

  // Validate form before save
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Farmer Name (required)
    const name = formData.fullName.trim();
    if (!name) {
      errors.fullName = 'Farmer full name is required.';
    } else if (!/^[\p{L}\p{M}\s.'’-]+$/u.test(name)) {
      errors.fullName = 'Farmer name should contain letters and standard punctuation only.';
    }

    // Phone: must be 10 digits to satisfy backend schema
    const phoneDigits = (user?.phone || formData.phone || '').replace(/\D/g, '').slice(-10);
    if (!phoneDigits || phoneDigits.length !== 10) {
      errors.phone = 'A valid 10-digit phone number is required.';
    }

    // State (required)
    if (!formData.state.trim()) {
      errors.state = 'Please select a State / Province.';
    }

    // City / Town (required)
    const city = formData.district.trim();
    if (!city) {
      errors.district = 'Please select or enter a City / Town.';
    } else if (!/^[\p{L}\p{M}\p{N}\s.,'’()/\-]+$/u.test(city)) {
      errors.district = 'City/Town should contain letters and standard characters only.';
    }

    // Land area: accept only a non-negative decimal number if entered
    const area = formData.landArea.trim();
    if (area !== '') {
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(area) || Number(area) < 0) {
        errors.landArea = 'Land holding area must be a non-negative number (0 or greater).';
      }
    }

    // Latitude: accept only a number between -90 and 90 if entered
    const latitude = formData.latitude.trim();
    if (latitude !== '') {
      const latNum = Number(latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errors.latitude = 'Latitude must be between -90° and 90°.';
      }
    }

    // Longitude: accept only a number between -180 and 180 if entered
    const longitude = formData.longitude.trim();
    if (longitude !== '') {
      const lonNum = Number(longitude);
      if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
        errors.longitude = 'Longitude must be between -180° and 180°.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Authoritative Save Workflow
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return; // Prevent duplicate submissions

    setValidationErrors({});
    if (!validate()) return;

    setIsSaving(true);
    setSaveSuccess(false);

    // 1. Snapshot the complete, latest form state
    const current = { ...formData };
    const cleanPhone = (user?.phone || current.phone || '').replace(/\D/g, '').slice(-10);

    const latNum = current.latitude.trim() !== '' ? Number(current.latitude) : undefined;
    const lonNum = current.longitude.trim() !== '' ? Number(current.longitude) : undefined;
    const areaNum = current.landArea.trim() !== '' ? Number(current.landArea) : undefined;

    // Preserve the avatar photo across all available local sources
    const resolvedAvatar =
      current.avatarUrl ||
      profile.avatarUrl ||
      user?.avatarUrl ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('kisan_avatar') : null) ||
      '';

    // 2. Build payload adhering strictly to backend FarmerSchema
    const payload: FarmerDbRecord = {
      farmer_id: current.farmerId || user?.uid || 'KS-FARMER-DEFAULT',
      name: current.fullName.trim() || 'Kisan',
      phone: cleanPhone,
      state: current.state.trim(),
      district: current.district.trim(),
      language: language || 'en',
      village: current.district.trim(),
      latitude: latNum !== undefined && !isNaN(latNum) ? latNum : undefined,
      longitude: lonNum !== undefined && !isNaN(lonNum) ? lonNum : undefined,
      land_area: areaNum !== undefined && !isNaN(areaNum) ? areaNum : undefined,
      primary_crops: current.primaryCrops.trim() || undefined,
      agro_climatic_zone: current.agroClimaticZone?.trim() || undefined,
    };

    const updated: FarmerProfile = {
      ...current,
      avatarUrl: resolvedAvatar,
      phone: cleanPhone || current.phone,
      village: current.district.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // 3. Submit through existing profile-saving service and AWAIT response
      const res = await saveFarmerProfileToDb(payload);
      if (!res || (res.status !== 'success' && !res.data)) {
        throw new Error(res?.message || 'Server did not confirm successful profile persistence.');
      }

      // 4. Update authoritative localStorage only after genuine API confirmation
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        if (resolvedAvatar) {
          localStorage.setItem('kisan_avatar', resolvedAvatar);
        }
      } catch (storageErr) {
        console.warn('LocalStorage save failed:', storageErr);
      }

      // 5. Update local state baseline & app context
      setProfile(updated);
      setFormData(updated);
      updateUserName(updated.fullName.trim() || 'Kisan');
      if (resolvedAvatar) {
        updateUserAvatar(resolvedAvatar);
      }

      // 6. Show success message and exit edit mode
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (apiErr: any) {
      console.error('Profile persistence failed:', apiErr);
      const errMsg =
        apiErr?.userMessage ||
        apiErr?.message ||
        'Failed to save profile to database. Please check your connection and try again.';
      setValidationErrors({ general: errMsg });
      // Keep edit mode active and preserve user's edits in formData so they can correct/retry
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edits and restore last saved profile baseline
  const handleCancel = () => {
    setFormData(profile);
    const activeAvatar =
      profile.avatarUrl ||
      user?.avatarUrl ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('kisan_avatar') : null) ||
      '';
    if (activeAvatar) {
      updateUserAvatar(activeAvatar);
    }
    setValidationErrors({});
    setGpsError(null);
    setGpsSuccessMsg(null);
    setCustomCityMode(false);
    setIsEditing(false);
  };

  // Sign out user and navigate back to landing page
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOutUser();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Avatar Initials Helper
  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'KS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Current active display photo across all available sources
  const currentAvatarUrl =
    (isEditing ? formData.avatarUrl : profile.avatarUrl) ||
    profile.avatarUrl ||
    formData.avatarUrl ||
    user?.avatarUrl ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('kisan_avatar') : null) ||
    '';

  const currentDisplayName = isEditing
    ? formData.fullName || user?.name || 'Kisan Sahayak'
    : profile.fullName || user?.name || 'Kisan Sahayak';

  const currentCropsList = isEditing ? formCropsList : profileCropsList;

  return (
    <div className="min-h-screen bg-stone-50/60 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-stone-200">
          <div className="min-w-0 space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kisan Sahayak Profile & Farm Records</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
              {t('profileTitle')}
            </h1>
            <p className="text-stone-600 text-sm sm:text-base max-w-2xl">
              {t('profileSubtitle')}
            </p>
          </div>

          {/* Action Buttons: Single Top-Level Control Set */}
          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            {!isEditing ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(profile);
                    setIsEditing(true);
                    setValidationErrors({});
                    setGpsError(null);
                    setGpsSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{t('editProfileBtn')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-stone-700 font-semibold text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer disabled:opacity-50"
                  aria-label={t('navLogout')}
                  title={t('navLogout')}
                >
                  <LogOut className="w-4 h-4 text-stone-500 hover:text-red-600" />
                  <span>{isLoggingOut ? t('loading') : t('navLogout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-white font-medium text-sm transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-stone-500" />
                  <span>{t('cancel')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : t('saveProfileBtn')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {saveSuccess && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 flex items-center gap-3 text-emerald-900 text-sm shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Profile saved successfully!</span> Your changes are saved on this device and synced with cloud farm intelligence.
            </div>
          </div>
        )}

        {validationErrors.general && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-center gap-3 text-red-900 text-sm shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-medium">{validationErrors.general}</span>
          </div>
        )}

        {/* Main Content Grid: Left Form (8 cols) & Right Summary (4 cols) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
          {/* Left Column: Form Details */}
          <div className="contents lg:block lg:col-span-7 xl:col-span-8 lg:space-y-6">
            {/* 1. Farmer Identity Card */}
            <section className="order-2 lg:order-none bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    {t('farmerInfoTitle')}
                  </h2>
                  <p className="text-xs text-stone-500">
                    Personal identity and registered farmer credentials
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    {t('fullNameLabel')}
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => updateFormField('fullName', e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 placeholder-stone-400 shadow-2xs"
                      />
                      {validationErrors.fullName && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.fullName}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-stone-900 font-medium text-base py-1">
                      {profile.fullName || <span className="text-stone-400 italic">Not specified</span>}
                    </div>
                  )}
                </div>

                {/* Phone / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{t('phoneLabel')}</span>
                    <span className="text-[10px] text-stone-400 font-normal lowercase">(verified)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={user?.phone || activeRecord.phone || 'Not provided'}
                      readOnly
                      aria-readonly="true"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 cursor-not-allowed text-sm font-medium"
                    />
                    <div className="absolute right-3 top-2.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                      Verified
                    </div>
                  </div>
                  {validationErrors.phone && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.phone}</p>
                  )}
                </div>

                {/* Farmer ID */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-stone-400" />
                    <span>{t('farmerIdLabel')}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200 font-mono text-xs font-bold text-stone-800 tracking-wide">
                      <span>{profile.farmerId || user.uid}</span>
                    </div>
                    <span className="text-xs text-stone-500">
                      System-assigned identifier linked to your agricultural database
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Farm Location & Coordinates Card */}
            <section className="order-3 lg:order-none bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">
                      {t('farmLocationTitle')}
                    </h2>
                    <p className="text-xs text-stone-500">
                      State, City/Town, and GPS coordinates for precision agro-meteorology
                    </p>
                  </div>
                </div>

                {/* GPS Auto-Detect Button: Available in Edit Mode */}
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gpsLoading}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs self-start sm:self-auto cursor-pointer"
                  >
                    {gpsLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                    <span>{gpsLoading ? 'Detecting Location...' : 'Detect My Location'}</span>
                  </button>
                )}
              </div>

              {/* GPS Success Banner */}
              {gpsSuccessMsg && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-center gap-2.5 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{gpsSuccessMsg}</span>
                </div>
              )}

              {/* GPS Error Banner */}
              {gpsError && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{gpsError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* State / Province */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="state-select"
                    className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
                  >
                    State / Province
                  </label>
                  {isEditing ? (
                    <div>
                      <select
                        id="state-select"
                        value={formData.state}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Select State / UT --</option>
                        {INDIAN_STATES_AND_UTS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      {validationErrors.state && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.state}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-stone-900 font-medium text-base py-1">
                      {profile.state || <span className="text-stone-400 italic">Not set</span>}
                    </div>
                  )}
                </div>

                {/* City / Town (Dynamically Filtered by State) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="city-select"
                      className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
                    >
                      City / Town
                    </label>
                    {isEditing && customCityMode && (
                      <button
                        type="button"
                        onClick={() => setCustomCityMode(false)}
                        className="text-[11px] text-emerald-700 font-semibold hover:underline cursor-pointer"
                      >
                        Select from list
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    customCityMode ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={formData.district}
                          onChange={(e) => updateFormField('district', e.target.value)}
                          placeholder="Enter City or Town name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 placeholder-stone-400 shadow-2xs"
                        />
                        {validationErrors.district && (
                          <p className="text-xs text-red-600 mt-1">{validationErrors.district}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <select
                          id="city-select"
                          disabled={!formData.state}
                          value={formData.district}
                          onChange={handleCitySelectChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 shadow-2xs disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="">
                            {formData.state
                              ? '-- Select City / Town --'
                              : 'Select State first'}
                          </option>

                          {formData.district &&
                            !stateDistricts.includes(formData.district) && (
                              <option value={formData.district}>
                                {formData.district}
                              </option>
                            )}

                          {stateDistricts.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}

                          {formData.state && (
                            <option value="__custom__">
                              + Other / Not listed...
                            </option>
                          )}
                        </select>
                        {validationErrors.district && (
                          <p className="text-xs text-red-600 mt-1">{validationErrors.district}</p>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="text-stone-900 font-medium text-base py-1">
                      {profile.district || <span className="text-stone-400 italic">Not set</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* GPS Coordinates (Latitude & Longitude) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-stone-100">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Latitude (°N)
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={formData.latitude}
                        onChange={(e) => updateFormField('latitude', e.target.value)}
                        placeholder="e.g. 23.34410"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 font-mono shadow-2xs"
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
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Longitude (°E)
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={formData.longitude}
                        onChange={(e) => updateFormField('longitude', e.target.value)}
                        placeholder="e.g. 85.30960"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 font-mono shadow-2xs"
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

              {isEditing && (
                <p className="text-[11px] text-stone-500 leading-normal">
                  Latitude and Longitude are auto-populated when you click "Detect My Location", or can be entered manually for exact field centroids.
                </p>
              )}
            </section>

            {/* 3. Farm Land & Crops Card */}
            <section className="order-4 lg:order-none bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Trees className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    Farm Land & Primary Crops
                  </h2>
                  <p className="text-xs text-stone-500">
                    Acreage and cultivated crops to tailor agronomic guidance
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Land Holding Area */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    {t('landAreaLabel')}
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={formData.landArea}
                        onChange={(e) => updateFormField('landArea', e.target.value)}
                        placeholder="e.g. 2.5"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 shadow-2xs"
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
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    {t('landUnitLabel')}
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.landUnit}
                      onChange={(e) => updateFormField('landUnit', e.target.value as 'acres' | 'hectares')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-stone-900 bg-white shadow-2xs cursor-pointer"
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

              {/* Primary Crops Section: Ordered A -> B -> C -> D */}
              <div className="space-y-3.5 pt-3 border-t border-stone-100">
                {/* A. Section Label */}
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  {t('primaryCropsLabel')}
                </label>

                {isEditing ? (
                  <div className="space-y-4">
                    {/* B. Quick Select options */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                        Quick Select:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_CROPS.map((crop) => {
                          const isSelected = formCropsList.includes(crop);
                          return (
                            <button
                              key={crop}
                              type="button"
                              onClick={() =>
                                isSelected
                                  ? handleRemoveCrop(crop)
                                  : handleAddCrop(crop)
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-700 text-white shadow-2xs'
                                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                              }`}
                            >
                              {isSelected ? `✓ ${crop}` : `+ ${crop}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* C. Custom crop input + Add button */}
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
                        placeholder="Add custom crop..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-stone-900 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCrop(newCropInput)}
                        className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* D. Selected crop chips */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                        Selected Crops:
                      </span>
                      <div className="flex flex-wrap gap-2 min-h-9 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                        {formCropsList.length === 0 ? (
                          <span className="text-xs text-stone-400 italic py-0.5">
                            No crops selected yet. Select from quick options above or type to add custom crops.
                          </span>
                        ) : (
                          formCropsList.map((crop) => (
                            <span
                              key={crop}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold shadow-2xs"
                            >
                              <span>{crop}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCrop(crop)}
                                className="p-0.5 rounded-full hover:bg-emerald-200 text-emerald-700 hover:text-emerald-900 focus:outline-none cursor-pointer"
                                aria-label={`Remove ${crop}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
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

          {/* Right Column: Profile Summary, Agro Zone & History */}
          <div className="contents lg:block lg:col-span-5 xl:col-span-4 lg:space-y-6">
            {/* Profile Summary Card with Cover Image */}
            <div className="order-1 lg:order-none bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
              {/* Agricultural Cover Landscape */}
              <div className="relative h-28 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 overflow-hidden">
                <img
                  src="/images/farm-landscape-banner.png"
                  alt="Agricultural farm landscape"
                  className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              {/* Centered Avatar and Profile Details */}
              <div className="px-6 pb-6 pt-0 text-center relative">
                {/* Avatar with Camera Edit Button (active when editing) */}
                <div className="relative -mt-12 inline-block">
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md overflow-hidden mx-auto">
                    {currentAvatarUrl ? (
                      <img
                        src={currentAvatarUrl}
                        alt="Farmer profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(currentDisplayName)}</span>
                    )}
                  </div>

                  {/* Hidden File Input for Avatar */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Camera icon button: visible in edit mode */}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Change profile picture"
                      className="absolute bottom-1 right-1 p-1.5 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white shadow-md transition-transform hover:scale-105 border-2 border-white focus:outline-none cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Farmer Name & ID */}
                <div className="mt-3 space-y-1">
                  <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                    {currentDisplayName}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-mono font-semibold">
                    <Hash className="w-3 h-3 text-stone-400" />
                    <span>{profile.farmerId || user.uid}</span>
                  </div>
                </div>

                {/* Compact Info Row: City, State • Landholding */}
                <div className="mt-4 pt-4 border-t border-stone-100 text-xs text-stone-600 space-y-2">
                  <div className="flex items-center justify-center gap-2 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {activeRecord.district || 'City/Town'}, {activeRecord.state || 'State'}
                    </span>
                    <span>•</span>
                    <Trees className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {activeRecord.landArea || '0'} {activeRecord.landUnit}
                    </span>
                  </div>

                  {/* Primary Crops Summary */}
                  {currentCropsList.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 pt-1">
                      {currentCropsList.slice(0, 4).map((crop) => (
                        <span
                          key={crop}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold"
                        >
                          {crop}
                        </span>
                      ))}
                      {currentCropsList.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px]">
                          +{currentCropsList.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Digital Farm Profile</span>
                  </div>

                  <div className="pt-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-stone-200 bg-stone-50/80 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-stone-600 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                      aria-label={t('navLogout')}
                    >
                      <LogOut className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-600" />
                      <span>{isLoggingOut ? t('loading') : t('navLogout')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Agro-Climatic Zone Card */}
            <section className="order-5 lg:order-none bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {t('agroClimaticZoneTitle')}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Ecological and agro-meteorological region
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-stone-50/80 border border-stone-200 p-4 space-y-3">
                {isEditing ? (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
                      Zone Classification
                    </label>
                    <select
                      value={formData.agroClimaticZone || ''}
                      onChange={(e) => updateFormField('agroClimaticZone', e.target.value || undefined)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-stone-900 bg-white shadow-2xs cursor-pointer"
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
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                      Zone Classification
                    </span>
                    <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg inline-block">
                      {profile.agroClimaticZone || 'Zone not selected yet'}
                    </div>
                  </div>
                )}

                <p className="text-xs text-stone-600 leading-relaxed">
                  {activeRecord.agroClimaticZone
                    ? `Configured for ${activeRecord.agroClimaticZone}. Soil advisory models use this zone to adapt N-P-K ratios and irrigation guidance.`
                    : 'Select your agro-climatic zone to adapt soil health recommendations to regional soil taxonomy.'}
                </p>

                <div className="pt-2 border-t border-stone-200/60">
                  <Link
                    to="/khet-swasthya"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 group"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Run Soil Health Evaluation</span>
                    <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* Field Records & History Card */}
            <section className="order-6 lg:order-none bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      {t('recordsSectionTitle')}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Synced field logs and soil evaluations
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Cloud Connected
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Soil Health Record Card */}
                <Link
                  to="/khet-swasthya"
                  className="block rounded-xl border border-stone-200/80 p-3 hover:bg-stone-50/80 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-stone-800 group-hover:text-emerald-700">
                      Soil Health Card Evaluations
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Evaluations run on Khet Swasthya are synced with your farmer ID.
                  </p>
                </Link>

                {/* Plant Pathology Card */}
                <Link
                  to="/diagnosis"
                  className="block rounded-xl border border-stone-200/80 p-3 hover:bg-stone-50/80 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-stone-800 group-hover:text-emerald-700">
                      Crop Pathology & Leaf Scans
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Fasal Rog Pehchan diagnosis records and pest outbreak advisories.
                  </p>
                </Link>
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
                  <span>Data Trust</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
