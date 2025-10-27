import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CandidateState, Candidate, QueryCandidatesParams, Pagination } from './candidateType';

// Initial state
const initialState: CandidateState = {
  candidates: [],
  selectedCandidate: null,
  totalCandidates: 0,
  pagination: null,
  filters: {
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  loading: false,
  error: null,
};

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },

    // Set candidates list
    setCandidates: (state, action: PayloadAction<Candidate[]>) => {
      state.candidates = action.payload;
      state.loading = false;
      state.error = null;
    },

    // Set selected candidate
    setSelectedCandidate: (state, action: PayloadAction<Candidate | null>) => {
      state.selectedCandidate = action.payload;
    },

    // Set pagination info
    setPagination: (state, action: PayloadAction<Pagination>) => {
      state.pagination = action.payload;
      state.totalCandidates = action.payload.total;
    },

    // Update filters
    setFilters: (state, action: PayloadAction<Partial<QueryCandidatesParams>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    // Reset filters to initial state
    resetFilters: (state) => {
      state.filters = {
        page: 1,
        limit: 12,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
    },

    // Update specific filter field
    updateFilter: (state, action: PayloadAction<{ field: keyof QueryCandidatesParams; value: any }>) => {
      const { field, value } = action.payload;
      state.filters = { ...state.filters, [field]: value };
      
      // Reset page to 1 when updating filters (except when updating page itself)
      if (field !== 'page') {
        state.filters.page = 1;
      }
    },

    // Add candidate to list (for real-time updates)
    addCandidate: (state, action: PayloadAction<Candidate>) => {
      state.candidates.unshift(action.payload);
      state.totalCandidates += 1;
    },

    // Update candidate in list
    updateCandidate: (state, action: PayloadAction<Candidate>) => {
      const index = state.candidates.findIndex(candidate => candidate.id === action.payload.id);
      if (index !== -1) {
        state.candidates[index] = action.payload;
      }
      
      // Update selected candidate if it's the same one
      if (state.selectedCandidate?.id === action.payload.id) {
        state.selectedCandidate = action.payload;
      }
    },

    // Remove candidate from list
    removeCandidate: (state, action: PayloadAction<string>) => {
      state.candidates = state.candidates.filter(candidate => candidate.id !== action.payload);
      state.totalCandidates = Math.max(0, state.totalCandidates - 1);
      
      // Clear selected candidate if it's the one being removed
      if (state.selectedCandidate?.id === action.payload) {
        state.selectedCandidate = null;
      }
    },

    // Update candidate status
    updateCandidateStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const { id, status } = action.payload;
      const candidate = state.candidates.find(c => c.id === id);
      if (candidate) {
        candidate.currentStatus = status as any;
      }
      
      if (state.selectedCandidate?.id === id) {
        state.selectedCandidate.currentStatus = status as any;
      }
    },

    // Clear all data (useful for logout)
    clearCandidateData: (state) => {
      state.candidates = [];
      state.selectedCandidate = null;
      state.totalCandidates = 0;
      state.pagination = null;
      state.error = null;
    },

    // Set search query
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
      state.filters.page = 1; // Reset to first page when searching
    },

    // Set status filter
    setStatusFilter: (state, action: PayloadAction<string | undefined>) => {
      state.filters.currentStatus = action.payload as any;
      state.filters.page = 1;
    },

    // Set team filter
    setTeamFilter: (state, action: PayloadAction<string | undefined>) => {
      state.filters.teamId = action.payload;
      state.filters.page = 1;
    },

    // Set source filter
    setSourceFilter: (state, action: PayloadAction<string | undefined>) => {
      state.filters.source = action.payload as any;
      state.filters.page = 1;
    },

    // Set assigned recruiter filter
    setAssignedToFilter: (state, action: PayloadAction<string | undefined>) => {
      state.filters.assignedTo = action.payload;
      state.filters.page = 1;
    },

    // Set sort options
    setSorting: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.filters.sortBy = action.payload.sortBy as any;
      state.filters.sortOrder = action.payload.sortOrder;
      state.filters.page = 1;
    },

    // Next page
    nextPage: (state) => {
      if (state.pagination && state.pagination.page < state.pagination.totalPages) {
        state.filters.page = (state.filters.page || 1) + 1;
      }
    },

    // Previous page
    previousPage: (state) => {
      if (state.filters.page && state.filters.page > 1) {
        state.filters.page = state.filters.page - 1;
      }
    },

    // Go to specific page
    goToPage: (state, action: PayloadAction<number>) => {
      const page = action.payload;
      if (page >= 1 && (!state.pagination || page <= state.pagination.totalPages)) {
        state.filters.page = page;
      }
    },
  },
});

// Export actions
export const {
  setLoading,
  setError,
  setCandidates,
  setSelectedCandidate,
  setPagination,
  setFilters,
  resetFilters,
  updateFilter,
  addCandidate,
  updateCandidate,
  removeCandidate,
  updateCandidateStatus,
  clearCandidateData,
  setSearchQuery,
  setStatusFilter,
  setTeamFilter,
  setSourceFilter,
  setAssignedToFilter,
  setSorting,
  nextPage,
  previousPage,
  goToPage,
} = candidateSlice.actions;

// Export reducer
export default candidateSlice.reducer;