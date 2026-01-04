import { create } from 'zustand';
import { projectsApi } from '../api/projects.api';

export const useProjectStore = create((set) => ({
   projects: [],
   selectedProject: null,
   isLoading: false,
   error: null,

   createProject: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.create(data);
         set((state) => ({ projects: [...state.projects, response.data], isLoading: false }));
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create project', isLoading: false });
         throw error;
      }
   },

   getProjectsByCompany: async (companyId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.getByCompany(companyId);
         set({ projects: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch projects', isLoading: false });
      }
   },

   getProjectById: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.getById(id);
         set({ selectedProject: response.data, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch project', isLoading: false });
      }
   },

   assignProject: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.assign(id, data);
         set((state) => ({
            selectedProject: state.selectedProject?.id === id ? response.data : state.selectedProject,
            isLoading: false
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to assign project', isLoading: false });
      }
   },

   updateWorkPercentage: async (id, percentage) => {
      // Optimistic update?
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.updateWorkPercentage(id, percentage);
         set((state) => ({
            projects: state.projects.map(p => p.id === id ? { ...p, ...response.data } : p),
            selectedProject: state.selectedProject?.id === id ? { ...state.selectedProject, ...response.data } : state.selectedProject,
            isLoading: false
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update percentage', isLoading: false });
      }
   },

   addResults: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         await projectsApi.addResults(id, data);
         set({ isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add results', isLoading: false });
      }
   },

   requestRevision: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         await projectsApi.requestRevision(id, data);
         set({ isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to request revision', isLoading: false });
      }
   },

   completeProject: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.complete(id);
         set((state) => ({
            projects: state.projects.map(p => p.id === id ? { ...p, ...response.data } : p),
            selectedProject: state.selectedProject?.id === id ? { ...state.selectedProject, ...response.data } : state.selectedProject,
            isLoading: false
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to complete project', isLoading: false });
      }
   }
}));
