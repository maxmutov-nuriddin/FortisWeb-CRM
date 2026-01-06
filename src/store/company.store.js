import { create } from 'zustand';
import { companiesApi } from '../api/companies.api';

export const useCompanyStore = create((set) => ({
   companies: [],
   selectedCompany: null,
   isLoading: false,
   error: null,

   createCompany: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await companiesApi.create(data);
         set((state) => {
            const currentCompanies = state.companies?.data?.companies || [];
            return {
               companies: {
                  ...state.companies,
                  data: {
                     ...state.companies?.data,
                     companies: [...currentCompanies, response.data.data]
                  }
               },
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create company', isLoading: false });
         throw error;
      }
   },

   getCompanies: async () => {
      set({ isLoading: true, error: null });
      try {
         const response = await companiesApi.getAll();
         set({ companies: response.data, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch companies', isLoading: false });
      }
   },

   getCompanyById: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await companiesApi.getById(id);
         set({ selectedCompany: response.data, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch company', isLoading: false });
      }
   },

   updateCompany: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await companiesApi.update(id, data);
         const updatedCompany = response.data.data;

         set((state) => {
            const currentCompanies = state.companies?.data?.companies || [];
            return {
               companies: {
                  ...state.companies,
                  data: {
                     ...state.companies?.data,
                     companies: currentCompanies.map((c) => (c._id === id ? updatedCompany : c))
                  }
               },
               selectedCompany: state.selectedCompany?._id === id ? updatedCompany : state.selectedCompany,
               isLoading: false,
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update company', isLoading: false });
      }
   },

   updateCompanyStatus: async (id, status) => {
      set({ isLoading: true, error: null });
      try {
         await companiesApi.updateStatus(id, status);
         set((state) => {
            const currentCompanies = state.companies?.data?.companies || [];
            return {
               companies: {
                  ...state.companies,
                  data: {
                     ...state.companies?.data,
                     companies: currentCompanies.map((c) => (c._id === id ? { ...c, isActive: status } : c))
                  }
               },
               isLoading: false,
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update status', isLoading: false });
      }
   },

   addTeam: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await companiesApi.addTeam(id, data);
         const newTeam = response.data.data?.team || response.data.team || response.data;

         set((state) => {
            const currentCompanies = state.companies?.data?.companies || (Array.isArray(state.companies) ? state.companies : []);

            const updatedCompanies = currentCompanies.map(c => {
               if (c._id === id) {
                  return {
                     ...c,
                     teams: [...(c.teams || []), newTeam]
                  };
               }
               return c;
            });

            const newState = {
               isLoading: false,
               companies: {
                  ...state.companies,
                  data: {
                     ...state.companies?.data,
                     companies: updatedCompanies
                  }
               }
            };

            if (state.selectedCompany?._id === id) {
               newState.selectedCompany = {
                  ...state.selectedCompany,
                  teams: [...(state.selectedCompany.teams || []), newTeam]
               };
            }

            return newState;
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add team', isLoading: false });
         throw error;
      }
   },

   addTeamMemberDirect: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await companiesApi.addTeamMemberDirect(id, data);
         const updatedTeam = response.data.data?.team || response.data.team || response.data;

         set((state) => {
            const currentCompanies = state.companies?.data?.companies || (Array.isArray(state.companies) ? state.companies : []);

            const updatedCompanies = currentCompanies.map(c => {
               if (c._id === id) {
                  return {
                     ...c,
                     teams: (c.teams || []).map(t => t._id === (data.teamId || updatedTeam._id) ? updatedTeam : t)
                  };
               }
               return c;
            });

            const newState = {
               isLoading: false,
               companies: {
                  ...state.companies,
                  data: {
                     ...state.companies?.data,
                     companies: updatedCompanies
                  }
               }
            };

            if (state.selectedCompany?._id === id) {
               newState.selectedCompany = {
                  ...state.selectedCompany,
                  teams: (state.selectedCompany.teams || []).map(t => t._id === (data.teamId || updatedTeam._id) ? updatedTeam : t)
               };
            }

            return newState;
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add team member', isLoading: false });
         throw error;
      }
   },
   deleteTeam: async (companyId, teamId) => {
      set({ isLoading: true, error: null });
      try {
         await companiesApi.deleteTeam(companyId, teamId);
         set((state) => {
            const currentCompanies = state.companies?.data?.companies || (Array.isArray(state.companies) ? state.companies : []);
            const updatedCompanies = currentCompanies.map(c => {
               if (c._id === companyId) {
                  return {
                     ...c,
                     teams: (c.teams || []).filter(t => t._id !== teamId)
                  };
               }
               return c;
            });

            const newState = {
               isLoading: false,
               companies: {
                  ...state.companies,
                  data: {
                     ...state.companies?.data,
                     companies: updatedCompanies
                  }
               }
            };

            if (state.selectedCompany?._id === companyId) {
               newState.selectedCompany = {
                  ...state.selectedCompany,
                  teams: (state.selectedCompany.teams || []).filter(t => t._id !== teamId)
               };
            }
            return newState;
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to delete team', isLoading: false });
         throw error;
      }
   },
   deleteCompany: async (companyId) => {
      set({ isLoading: true, error: null });
      try {
         await companiesApi.delete(companyId);

         set((state) => {
            const currentCompanies = state.companies?.data?.companies || [];
            return {
               companies: {
                  ...state.companies,
                  data: {
                     ...state.companies?.data,
                     companies: currentCompanies.filter(c => c._id !== companyId)
                  }
               },
               isLoading: false
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to delete company', isLoading: false });
         throw error;
      }
   },
}));
