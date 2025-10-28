import { useGetStatusConfigQuery } from '../api';
import { CANDIDATE_STATUS_CONFIG } from '../../../constants/statuses';

export interface StatusConfig {
  label: string;
  description: string;
  color: string;
  badgeClass: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export type StatusConfigMap = Record<string, StatusConfig>;

/**
 * Hook to get status configuration from backend
 * Falls back to local constants if backend is unavailable
 */
export const useStatusConfig = () => {
  const {
    data: statusConfigResponse,
    isLoading,
    error,
  } = useGetStatusConfigQuery();

  // Use backend data if available, otherwise fall back to local constants
  const statusConfig: StatusConfigMap = statusConfigResponse?.data || CANDIDATE_STATUS_CONFIG;

  return {
    statusConfig,
    isLoading,
    error,
  };
};
