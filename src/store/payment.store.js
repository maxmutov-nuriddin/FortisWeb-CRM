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
         set((state) => ({ payments: [...state.payments, response.data], isLoading: false }));
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
         set((state) => ({
            payments: state.payments.map((p) => (p.id === id ? response.data : p)),
            isLoading: false,
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to confirm payment', isLoading: false });
      }
   },

   completePayment: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.complete(id);
         set((state) => ({
            payments: state.payments.map((p) => (p.id === id ? response.data : p)),
            isLoading: false,
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to complete payment', isLoading: false });
      }
   },

   getPaymentsByCompany: async (companyId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.getByCompany(companyId);
         set({ payments: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch payments', isLoading: false });
      }
   },

   getPaymentsByUser: async (userId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.getByUser(userId);
         set({ payments: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch user payments', isLoading: false });
      }
   },
}));
