import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFarmerProfileFromDb, type FarmerDbRecord } from '../services/farmer';
import { fetchWeatherForecast, fetchEarlyWarningAlerts } from '../services/telemetry';
import { getFarmerHistory } from '../services/history';
import type { FarmerProfile } from '../types/profile.types';
import type {
  DashboardData,
  WeatherState,
  AlertsState,
  HistoryState,
  DashboardMetrics,
  CropItem,
  RecommendationItem,
} from '../types/dashboard.types';
import type { HistoryItem } from '../types/history.types';
import type { LiveAlertEntry } from '../types/telemetry.types';

const SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
};

export function useDashboardData(): DashboardData {
  const { user } = useAuth();

  const storageKey = useMemo(() => {
    return user?.uid ? `kisan_farmer_profile_${user.uid}` : 'kisan_farmer_profile_guest';
  }, [user?.uid]);

  // Identity-tagged profile state prevents cross-account flicker.
  // The state is always tagged with the storage key it was loaded from.
  // The visible profile is derived via useMemo: if the tag matches the current
  // storageKey, the cached value is used immediately. On identity switch (before
  // the effect fires), we synchronously read localStorage for the new key so
  // no previous account data is ever exposed — no setState during render.
  interface TaggedProfile {
    identityKey: string;
    profile: FarmerProfile | null;
  }

  const [taggedProfile, setTaggedProfile] = useState<TaggedProfile>(() => {
    const key = user?.uid ? `kisan_farmer_profile_${user.uid}` : 'kisan_farmer_profile_guest';
    try {
      const cached = localStorage.getItem(key);
      return { identityKey: key, profile: cached ? (JSON.parse(cached) as FarmerProfile) : null };
    } catch {
      return { identityKey: key, profile: null };
    }
  });

  // Derive the visible profile without calling setState during render.
  // On identity transition, fall back synchronously to the new key in cache.
  const profile = useMemo<FarmerProfile | null>(() => {
    if (taggedProfile.identityKey === storageKey) {
      return taggedProfile.profile;
    }
    try {
      const cached = localStorage.getItem(storageKey);
      return cached ? (JSON.parse(cached) as FarmerProfile) : null;
    } catch {
      return null;
    }
  }, [taggedProfile, storageKey]);

  const [profileLoading, setProfileLoading] = useState(false);

  const [weather, setWeather] = useState<WeatherState>({
    status: 'loading',
    data: null,
    errorMessage: null,
  });

  const [alerts, setAlerts] = useState<AlertsState>({
    status: 'loading',
    data: [],
    errorMessage: null,
  });

  const [history, setHistory] = useState<HistoryState>(() => ({
    status: user?.uid ? 'loading' : 'empty',
    items: [],
    latestDiagnosis: null,
    recentAssessmentsCount: 0,
    errorMessage: null,
  }));

  // Coordinates validation
  const parsedCoords = useMemo(() => {
    if (!profile?.latitude || !profile?.longitude) return null;
    const lat = parseFloat(String(profile.latitude).trim());
    const lon = parseFloat(String(profile.longitude).trim());

    if (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90.0 &&
      lat <= 90.0 &&
      lon >= -180.0 &&
      lon <= 180.0
    ) {
      return { lat, lon };
    }
    return null;
  }, [profile?.latitude, profile?.longitude]);

  const hasCoordinates = Boolean(parsedCoords);

  // 1. Profile Synchronization: stale-while-revalidate with cancellation
  useEffect(() => {
    let isCancelled = false;

    // Update tagged profile for the current identity when the effect fires.
    try {
      const cached = localStorage.getItem(storageKey);
      setTaggedProfile({
        identityKey: storageKey,
        profile: cached ? (JSON.parse(cached) as FarmerProfile) : null,
      });
    } catch {
      setTaggedProfile({ identityKey: storageKey, profile: null });
    }

    if (!user?.uid) {
      // Guest profile: do not fetch from cloud database
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    getFarmerProfileFromDb(user.uid)
      .then((cloudData: FarmerDbRecord) => {
        if (isCancelled) return;

        if (cloudData && (cloudData.name || cloudData.phone || cloudData.state)) {
          // Use taggedProfile.profile (stable ref in closure) as the previous
          // value so we never read stale data from another account.
          const prev = taggedProfile.profile;
          const mapped: FarmerProfile = {
            fullName: cloudData.name || user.name || prev?.fullName || '',
            phone: cloudData.phone || user.phone || prev?.phone || '',
            farmerId: cloudData.farmer_id || user.uid,
            village: cloudData.village || prev?.village || '',
            district: cloudData.district || prev?.district || '',
            state: cloudData.state || prev?.state || '',
            latitude:
              cloudData.latitude != null
                ? String(cloudData.latitude)
                : prev?.latitude || '',
            longitude:
              cloudData.longitude != null
                ? String(cloudData.longitude)
                : prev?.longitude || '',
            landArea:
              cloudData.land_area != null
                ? String(cloudData.land_area)
                : prev?.landArea || '',
            landUnit: prev?.landUnit || 'acres',
            primaryCrops: cloudData.primary_crops || prev?.primaryCrops || '',
            agroClimaticZone: cloudData.agro_climatic_zone || prev?.agroClimaticZone,
            updatedAt: new Date().toISOString(),
          };

          try {
            localStorage.setItem(storageKey, JSON.stringify(mapped));
          } catch (err) {
            console.warn('[Dashboard] Could not cache refreshed profile', err);
          }

          setTaggedProfile({ identityKey: storageKey, profile: mapped });
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('[Dashboard] Cloud profile sync notice:', err?.userMessage || err);
      })
      .finally(() => {
        if (!isCancelled) {
          setProfileLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user?.uid, storageKey, user?.name, user?.phone]);

  // 2. Weather and Early Warnings: Concurrent fetch with independent fault tolerance
  useEffect(() => {
    let isCancelled = false;

    if (!parsedCoords) {
      setWeather({
        status: 'no_location',
        data: null,
        errorMessage: null,
      });
      setAlerts({
        status: 'no_location',
        data: [],
        errorMessage: null,
      });
      return;
    }

    setWeather((prev) => ({ ...prev, status: 'loading', errorMessage: null }));
    setAlerts((prev) => ({ ...prev, status: 'loading', errorMessage: null }));

    Promise.allSettled([
      fetchWeatherForecast(parsedCoords.lat, parsedCoords.lon),
      fetchEarlyWarningAlerts(parsedCoords.lat, parsedCoords.lon),
    ]).then(([weatherRes, alertsRes]) => {
      if (isCancelled) return;

      // Handle Weather Response
      if (weatherRes.status === 'fulfilled' && weatherRes.value?.data) {
        setWeather({
          status: 'ready',
          data: weatherRes.value.data,
          errorMessage: null,
        });
      } else {
        const errorReason =
          weatherRes.status === 'rejected'
            ? weatherRes.reason?.userMessage || 'Weather feed temporarily unavailable.'
            : 'Invalid weather data received.';
        setWeather({
          status: 'error',
          data: null,
          errorMessage: errorReason,
        });
      }

      // Handle Early Warning Alerts Response
      if (alertsRes.status === 'fulfilled' && alertsRes.value) {
        const rawAlerts: LiveAlertEntry[] = Array.isArray(alertsRes.value.active_alerts)
          ? alertsRes.value.active_alerts
          : [];

        // Sort descending by severity (HIGH > MODERATE > LOW)
        const sortedAlerts = [...rawAlerts].sort((a, b) => {
          const weightA = SEVERITY_WEIGHT[a.severity?.toUpperCase() || ''] || 0;
          const weightB = SEVERITY_WEIGHT[b.severity?.toUpperCase() || ''] || 0;
          return weightB - weightA;
        });

        setAlerts({
          status: 'ready',
          data: sortedAlerts,
          errorMessage: null,
        });
      } else {
        const errorReason =
          alertsRes.status === 'rejected'
            ? alertsRes.reason?.userMessage || 'Alert telemetry temporarily unavailable.'
            : 'Invalid alert data received.';
        setAlerts({
          status: 'error',
          data: [],
          errorMessage: errorReason,
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [parsedCoords]);

  // 3. History & Assessments: Query verified history service
  useEffect(() => {
    let isCancelled = false;

    if (!user?.uid) {
      setHistory({
        status: 'empty',
        items: [],
        latestDiagnosis: null,
        recentAssessmentsCount: 0,
        errorMessage: null,
      });
      return;
    }

    const historyFarmerId = user.uid.startsWith('FARM_') || user.uid.startsWith('KS-')
      ? user.uid
      : `KS-${user.uid.slice(0, 8).toUpperCase()}`;

    setHistory((prev) => ({ ...prev, status: 'loading', errorMessage: null }));

    getFarmerHistory(historyFarmerId, 50)
      .then((records: HistoryItem[]) => {
        if (isCancelled) return;

        const items = Array.isArray(records) ? records : [];

        // Find newest leaf diagnosis with valid timestamp
        const diagnoses = items.filter((item) => item.type === 'diagnosis');
        const sortedDiagnoses = [...diagnoses].sort((a, b) => {
          const timeA = new Date(a.date).getTime() || 0;
          const timeB = new Date(b.date).getTime() || 0;
          return timeB - timeA;
        });

        const latest = sortedDiagnoses[0] || null;

        // Calculate assessments within last 30 days based on reliable timestamps
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentCount = items.filter((item) => {
          const t = new Date(item.date).getTime();
          return !isNaN(t) && t >= thirtyDaysAgo;
        }).length;

        setHistory({
          status: items.length === 0 ? 'empty' : 'ready',
          items,
          latestDiagnosis: latest,
          recentAssessmentsCount: recentCount,
          errorMessage: null,
        });
      })
      .catch((err) => {
        if (isCancelled) return;
        setHistory({
          status: 'error',
          items: [],
          latestDiagnosis: null,
          recentAssessmentsCount: 0,
          errorMessage: err?.userMessage || 'Failed to retrieve assessment history.',
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  // 4. Derived Metrics
  const cropsList: CropItem[] = useMemo(() => {
    if (!profile?.primaryCrops) return [];
    return profile.primaryCrops
      .split(',')
      .map((crop) => crop.trim())
      .filter(Boolean)
      .map((crop) => ({
        name: crop,
        status: 'Registered',
      }));
  }, [profile?.primaryCrops]);

  const metrics: DashboardMetrics = useMemo(() => {
    const hasLand = Boolean(profile?.landArea && profile.landArea.trim() !== '');

    let activeAlertsStatus: 'loading' | 'ready' | 'no_location' | 'error' = alerts.status;
    let activeAlertsCount: number | null = null;

    if (alerts.status === 'ready') {
      activeAlertsCount = alerts.data.length;
    }

    return {
      totalLand: {
        value: hasLand ? profile!.landArea.trim() : '',
        unit: profile?.landUnit || 'acres',
        isRecorded: hasLand,
      },
      registeredCropsCount: cropsList.length,
      recentAssessmentsCount: user ? history.recentAssessmentsCount : null,
      recentAssessmentsLabel: 'in last 30 days',
      activeAlertsCount,
      activeAlertsStatus,
    };
  }, [user, profile?.landArea, profile?.landUnit, cropsList.length, history.recentAssessmentsCount, alerts.status, alerts.data.length]);

  // 5. Synthesize Recommendations from verified alerts & spray advisory
  const recommendations: RecommendationItem[] = useMemo(() => {
    const list: RecommendationItem[] = [];

    // Early warning proactive actions (priority)
    if (alerts.status === 'ready' && alerts.data.length > 0) {
      alerts.data.forEach((alert) => {
        if (Array.isArray(alert.proactive_actions) && alert.proactive_actions.length > 0) {
          alert.proactive_actions.slice(0, 2).forEach((actionText, index) => {
            list.push({
              id: `${alert.id}-act-${index}`,
              title: alert.type || 'Telemetry Risk Action',
              description: actionText,
              category: 'alert',
              severity: (alert.severity?.toUpperCase() as 'HIGH' | 'MODERATE' | 'LOW') || 'MODERATE',
              actionText: 'View Telemetry',
              actionLink: '/kisaan-telemetry',
            });
          });
        }
      });
    }

    // Weather spray condition advisory
    if (weather.status === 'ready' && weather.data?.current?.spray_advisory) {
      const isSafe = weather.data.current.spray_advisory === 'SAFE_TO_SPRAY';
      const rainProb = weather.data.current.next_12h_rain_chance_pct ?? 0;
      const windKmh = weather.data.current.wind_speed_kmh ?? 0;

      list.push({
        id: 'weather-spray-rec',
        title: isSafe ? 'Favorable Foliar Spray Window' : 'Postpone Chemical / Bio Sprays',
        description: isSafe
          ? `Current wind (${windKmh} km/h) and rain probability (${rainProb}%) are within safe spray thresholds.`
          : `High spray drift or rain wash-off risk: ${rainProb}% rain chance, ${windKmh} km/h wind in next 12 hours.`,
        category: 'weather',
        severity: isSafe ? 'LOW' : 'HIGH',
      });
    }

    return list;
  }, [alerts.status, alerts.data, weather.status, weather.data]);

  const refreshDashboard = useCallback(async () => {
    if (parsedCoords) {
      try {
        const [wRes, aRes] = await Promise.allSettled([
          fetchWeatherForecast(parsedCoords.lat, parsedCoords.lon),
          fetchEarlyWarningAlerts(parsedCoords.lat, parsedCoords.lon),
        ]);
        if (wRes.status === 'fulfilled' && wRes.value.data) {
          setWeather({ status: 'ready', data: wRes.value.data, errorMessage: null });
        }
        if (aRes.status === 'fulfilled' && aRes.value) {
          const sorted = [...(aRes.value.active_alerts || [])].sort(
            (a, b) => (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0)
          );
          setAlerts({ status: 'ready', data: sorted, errorMessage: null });
        }
      } catch (err) {
        console.warn('[Dashboard] Refresh error', err);
      }
    }
  }, [parsedCoords]);

  return {
    profile,
    profileLoading,
    weather,
    alerts,
    history,
    metrics,
    cropsList,
    recommendations,
    hasCoordinates,
    refreshDashboard,
  };
}
