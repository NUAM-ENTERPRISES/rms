import { ReactNode } from "react";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { LoadingSpinner } from "@/components/molecules/LoadingSpinner";

interface SystemConfigProviderProps {
  children: ReactNode;
}

/**
 * SystemConfigProvider - Initializes system configuration at app startup
 * This ensures system config is available throughout the app
 */
export function SystemConfigProvider({ children }: SystemConfigProviderProps) {
  const { data: systemConfig, isLoading, error } = useSystemConfig();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-slate-600">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="h-8 w-8 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Failed to load system configuration
          </h2>
          <p className="text-slate-600 mb-4">
            Unable to load system configuration. Please refresh the page or
            contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
