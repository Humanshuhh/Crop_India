import type { FarmerProfile } from './profile.types';
import type { WeatherForecastData, LiveAlertEntry } from './telemetry.types';
import type { HistoryItem } from './history.types';

export interface DashboardMetrics {
  totalLand: {
    value: string;
    unit: string;
    isRecorded: boolean;
  };
  registeredCropsCount: number;
  recentAssessmentsCount: number | null;
  recentAssessmentsLabel: string;
  activeAlertsCount: number | null;
  activeAlertsStatus: 'loading' | 'ready' | 'no_location' | 'error';
}

export interface WeatherState {
  status: 'loading' | 'ready' | 'no_location' | 'error';
  data: WeatherForecastData | null;
  errorMessage: string | null;
}

export interface AlertsState {
  status: 'loading' | 'ready' | 'no_location' | 'error';
  data: LiveAlertEntry[];
  errorMessage: string | null;
}

export interface HistoryState {
  status: 'loading' | 'ready' | 'empty' | 'error';
  items: HistoryItem[];
  latestDiagnosis: HistoryItem | null;
  recentAssessmentsCount: number | null;
  errorMessage: string | null;
}

export interface CropItem {
  name: string;
  status: string;
}

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  category: 'weather' | 'alert' | 'general';
  severity?: 'HIGH' | 'MODERATE' | 'LOW';
  actionText?: string;
  actionLink?: string;
  onClick?: () => void;
}

export interface DashboardData {
  profile: FarmerProfile | null;
  profileLoading: boolean;
  weather: WeatherState;
  alerts: AlertsState;
  history: HistoryState;
  metrics: DashboardMetrics;
  cropsList: CropItem[];
  recommendations: RecommendationItem[];
  hasCoordinates: boolean;
  refreshDashboard: () => Promise<void>;
}
