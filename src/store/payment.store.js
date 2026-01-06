import { create } from 'zustand';
import { paymentsApi } from '../api/payments.api';

export const usePaymentStore = create((set) => ({
   payments: [],
   isLoading: false,
   error: null,

   createPayment: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.create(data);
         const newPayment = response.data;
         set((state) => {
            const currentList = state.payments?.data?.payments || (Array.isArray(state.payments) ? state.payments : []);
            return {
               payments: {
                  ...state.payments,
                  data: {
                     ...state.payments?.data,
                     payments: [...currentList, newPayment]
                  }
               },
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create payment', isLoading: false });
         throw error;
      }
   },

   confirmPayment: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.confirm(id);
         const updatedPayment = response.data;
         set((state) => {
            const currentList = state.payments?.data?.payments || (Array.isArray(state.payments) ? state.payments : []);
            return {
               payments: {
                  ...state.payments,
                  data: {
                     ...state.payments?.data,
                     payments: currentList.map((p) => (p.id === id || p._id === id ? updatedPayment : p))
                  }
               },
               isLoading: false
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to confirm payment', isLoading: false });
      }
   },

   completePayment: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.complete(id);
         const updatedPayment = response.data;
         set((state) => {
            const currentList = state.payments?.data?.payments || (Array.isArray(state.payments) ? state.payments : []);
            return {
               payments: {
                  ...state.payments,
                  data: {
                     ...state.payments?.data,
                     payments: currentList.map((p) => (p.id === id || p._id === id ? updatedPayment : p))
                  }
               },
               isLoading: false
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to complete payment', isLoading: false });
      }
   },

   getPaymentsByCompany: async (companyId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.getByCompany(companyId);
         // Standardize to { data: { payments: [...] } } if it's just of type list or similar
         const data = response.data?.data?.payments || response.data?.payments || (Array.isArray(response.data) ? response.data : []);
         set({
            payments: {
               data: { payments: data },
               success: true
            },
            isLoading: false
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch payments', isLoading: false });
      }
   },

   getAllPayments: async (companyIds) => {
      if (!companyIds || companyIds.length === 0) {
         set({ payments: [], isLoading: false });
         return;
      }
      set({ isLoading: true, error: null });
      try {
         const promises = companyIds.map(id => paymentsApi.getByCompany(id));
         const results = await Promise.all(promises);
         let allPayments = [];
         results.forEach(res => {
            const data = res.data?.data?.payments || res.data?.payments || (Array.isArray(res.data) ? res.data : []);
            allPayments = [...allPayments, ...data];
         });
         // Sort by creation date descending
         allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
         set({
            payments: {
               data: { payments: allPayments },
               success: true
            },
            isLoading: false
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch all payments', isLoading: false });
      }
   },

   getPaymentsByUser: async (userId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.getByUser(userId);
         const data = response.data?.data?.payments || response.data?.payments || (Array.isArray(response.data) ? response.data : []);
         set({
            payments: {
               data: { payments: data },
               success: true
            },
            isLoading: false
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch user payments', isLoading: false });
      }
   },
}));
