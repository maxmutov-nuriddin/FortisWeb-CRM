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
         set((state) => ({
            companies: state.companies.map((c) => (c.id === id ? response.data : c)),
            selectedCompany: state.selectedCompany?.id === id ? response.data : state.selectedCompany,
            isLoading: false,
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update company', isLoading: false });
      }
   },

   updateCompanyStatus: async (id, status) => {
      set({ isLoading: true, error: null });
      try {
         await companiesApi.updateStatus(id, status);
         set((state) => ({
            companies: state.companies.map((c) => (c.id === id ? { ...c, status } : c)),
            isLoading: false,
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update status', isLoading: false });
      }
   },

   addTeam: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await companiesApi.addTeam(id, data);
         // Update selected company teams if possible
         set((state) => {
            if (state.selectedCompany && state.selectedCompany.id === id) {
               return {
                  selectedCompany: {
                     ...state.selectedCompany,
                     teams: [...(state.selectedCompany.teams || []), response.data]
                  },
                  isLoading: false
               };
            }
            return { isLoading: false };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add team', isLoading: false });
      }
   },

   addTeamMember: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         await companiesApi.addTeamMemberDirect(id, data);
         // Refresh company data to see new members? Or manually update?
         // For now just toggle loading
         set({ isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add team member', isLoading: false });
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
