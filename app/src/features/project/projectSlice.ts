import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Project, PaginatedProjects } from "./projectTypes";

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  pagination: null,
  isLoading: false,
  error: null,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setProjects: (state, action: PayloadAction<PaginatedProjects>) => {
      state.projects = action.payload.projects;
      state.pagination = action.payload.pagination;
    },
    setCurrentProject: (state, action: PayloadAction<Project>) => {
      state.currentProject = action.payload;
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Add a project to the list (for real-time updates)
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.unshift(action.payload);
      if (state.pagination) {
        state.pagination.total += 1;
      }
    },
    // Update a project in the list
    updateProject: (state, action: PayloadAction<Project>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      if (state.currentProject?.id === action.payload.id) {
        state.currentProject = action.payload;
      }
    },
    // Remove a project from the list
    removeProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter(p => p.id !== action.payload);
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null;
      }
      if (state.pagination) {
        state.pagination.total = Math.max(0, state.pagination.total - 1);
      }
    },
  },
});

export const {
  setProjects,
  setCurrentProject,
  clearCurrentProject,
  setLoading,
  setError,
  clearError,
  addProject,
  updateProject,
  removeProject,
} = projectSlice.actions;

export default projectSlice.reducer;
