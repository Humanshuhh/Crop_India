/**
 * Diagnostic & Advisory History Types
 * Contract for future History endpoints.
 */

export type HistoryRecordType = 'diagnosis' | 'soil_evaluation' | 'early_warning';

export interface HistoryItem {
  id: string;
  type: HistoryRecordType;
  title: string;
  summary: string;
  date: string;
  status_or_confidence?: string;
  tags?: string[];
  details?: Record<string, any>;
}

export type HistoryFilter = 'all' | 'soil_evaluation' | 'diagnosis' | 'early_warning';

