import { create } from 'zustand';
import { projectsApi } from '../api/projects.api';
import { usePaymentStore } from './payment.store';

export const useProjectStore = create((set) => ({
   projects: [],
   selectedProject: null,
   isLoading: false,
   error: null,

   createProject: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.create(data);
         const newProject = response.data.data?.project || response.data;
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: [newProject, ...currentList]
                  }
               },
               isLoading: false
            };
         });
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
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch projects', isLoading: false });
         return null;
      }
   },

   getAllProjects: async (companyIds) => {
      if (!companyIds || companyIds.length === 0) {
         set({ projects: [], isLoading: false });
         return;
      }
      set({ isLoading: true, error: null });
      try {
         const promises = companyIds.map(id => projectsApi.getByCompany(id));
         const results = await Promise.all(promises);
         let allProjects = [];
         results.forEach(res => {
            const projectsArray = res.data.data?.projects || res.data.projects || (Array.isArray(res.data) ? res.data : []);
            allProjects = [...allProjects, ...projectsArray];
         });
         // Sort by creation date descending
         allProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
         set({
            projects: {
               data: { projects: allProjects },
               success: true
            },
            isLoading: false
         });
         return { data: { projects: allProjects }, success: true };
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch all projects', isLoading: false });
         return { data: { projects: [] }, success: false };
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

   updateProject: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.update(id, data);
         const updatedProject = response.data.data?.project || response.data;
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: currentList.map(p => (p._id === id || p.id === id) ? updatedProject : p)
                  }
               },
               selectedProject: (state.selectedProject?._id === id || state.selectedProject?.id === id) ? updatedProject : state.selectedProject,
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update project', isLoading: false });
         throw error;
      }
   },

   deleteProject: async (id) => {
      set({ isLoading: true, error: null });
      try {
         // Attempt to delete associated payments first
         try {
            const { deletePaymentsByProject } = usePaymentStore.getState();
            await deletePaymentsByProject(id);
         } catch (payError) {
            console.warn('Payment cleanup failed, proceeding with project deletion:', payError);
         }

         await projectsApi.delete(id);
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: currentList.filter(p => (p._id !== id && p.id !== id))
                  }
               },
               selectedProject: (state.selectedProject?._id === id || state.selectedProject?.id === id) ? null : state.selectedProject,
               isLoading: false
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to delete project', isLoading: false });
         throw error;
      }
   },

   assignProject: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.assign(id, data);
         const updatedProject = response.data.data?.project || response.data;
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: currentList.map(p => (p._id === id || p.id === id) ? updatedProject : p)
                  }
               },
               selectedProject: (state.selectedProject?._id === id || state.selectedProject?.id === id) ? updatedProject : state.selectedProject,
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to assign project', isLoading: false });
         throw error;
      }
   },

   updateWorkPercentage: async (id, membersWork) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.updateWorkPercentage(id, membersWork);
         const updatedProject = response.data.data?.project || response.data;
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: currentList.map(p => (p._id === id || p.id === id) ? updatedProject : p)
                  }
               },
               selectedProject: (state.selectedProject?._id === id || state.selectedProject?.id === id) ? updatedProject : state.selectedProject,
               isLoading: false
            };
         });
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

   addRepository: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.addRepository(id, data);
         const updatedProject = response.data.data?.project || response.data;
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: currentList.map(p => (p._id === id || p.id === id) ? updatedProject : p)
                  }
               },
               selectedProject: (state.selectedProject?._id === id || state.selectedProject?.id === id) ? updatedProject : state.selectedProject,
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add repository', isLoading: false });
         throw error;
      }
   },

   getRepoCommits: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.getRepoCommits(id);
         set({ repoCommits: response.data.data || response.data, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to get commits', isLoading: false });
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
         const updatedProject = response.data.data?.project || response.data;
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: currentList.map(p => (p._id === id || p.id === id) ? updatedProject : p)
                  }
               },
               selectedProject: (state.selectedProject?._id === id || state.selectedProject?.id === id) ? updatedProject : state.selectedProject,
               isLoading: false
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to complete project', isLoading: false });
      }
   },

   acceptProject: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.accept(id, data);
         const updatedProject = response.data.data?.project || response.data;
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: currentList.map(p => (p._id === id || p.id === id) ? updatedProject : p)
                  }
               },
               selectedProject: (state.selectedProject?._id === id || state.selectedProject?.id === id) ? updatedProject : state.selectedProject,
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to accept project', isLoading: false });
         throw error;
      }
   },

   updateProjectStatusFlags: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.updateStatusFlags(id, data);
         const updatedProject = response.data.data?.project || response.data;
         set((state) => {
            const currentList = state.projects?.data?.projects || (Array.isArray(state.projects) ? state.projects : []);
            return {
               projects: {
                  ...state.projects,
                  data: {
                     ...state.projects?.data,
                     projects: currentList.map(p => (p._id === id || p.id === id) ? updatedProject : p)
                  }
               },
               selectedProject: (state.selectedProject?._id === id || state.selectedProject?.id === id) ? updatedProject : state.selectedProject,
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update project status flags', isLoading: false });
         throw error;
      }
   },

   getOrderHistory: async () => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectsApi.getOrderHistory();
         set({ orderHistory: response.data.data || response.data, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to get order history', isLoading: false });
      }
   }
}));
