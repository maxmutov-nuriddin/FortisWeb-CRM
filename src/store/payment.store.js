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
         const newPayment = response.data?.data?.payment || response.data?.payment || response.data;
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
         return newPayment;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create payment', isLoading: false });
         throw error;
      }
   },

   confirmPayment: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.confirm(id);
         const updatedPayment = response.data?.data?.payment || response.data?.payment || response.data;
         set((state) => {
            const currentList = state.payments?.data?.payments || (Array.isArray(state.payments) ? state.payments : []);
            return {
               payments: {
                  ...state.payments,
                  data: {
                     ...state.payments?.data,
                     payments: currentList.map((p) => (String(p.id || p._id) === String(id) ? updatedPayment : p))
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
         const updatedPayment = response.data?.data?.payment || response.data?.payment || response.data;
         set((state) => {
            const currentList = state.payments?.data?.payments || (Array.isArray(state.payments) ? state.payments : []);
            return {
               payments: {
                  ...state.payments,
                  data: {
                     ...state.payments?.data,
                     payments: currentList.map((p) => (String(p.id || p._id) === String(id) ? updatedPayment : p))
                  }
               },
               isLoading: false
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to complete payment', isLoading: false });
      }
   },

   updatePayment: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.update(id, data);
         const updatedPayment = response.data?.data?.payment || response.data?.payment || response.data;
         set((state) => {
            const currentList = state.payments?.data?.payments || (Array.isArray(state.payments) ? state.payments : []);
            return {
               payments: {
                  ...state.payments,
                  data: {
                     ...state.payments?.data,
                     payments: currentList.map((p) => (String(p.id || p._id) === String(id) ? updatedPayment : p))
                  }
               },
               isLoading: false
            };
         });
         return updatedPayment;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update payment', isLoading: false });
         throw error;
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

   getPaymentHistory: async (params) => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.getHistory(params);
         set({ paymentHistory: response.data.data || response.data, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to get payment history', isLoading: false });
      }
   },

   exportPaymentHistory: async () => {
      set({ isLoading: true, error: null });
      try {
         const response = await paymentsApi.exportHistory();
         // Create blob link to download
         const url = window.URL.createObjectURL(new Blob([response.data]));
         const link = document.createElement('a');
         link.href = url;
         link.setAttribute('download', 'payment-history.csv');
         document.body.appendChild(link);
         link.click();
         link.remove();
         set({ isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to export history', isLoading: false });
      }
   },

   deletePaymentHistory: async (id) => {
      set({ isLoading: true, error: null });
      try {
         await paymentsApi.deleteHistory(id);
         set((state) => ({
            paymentHistory: Array.isArray(state.paymentHistory)
               ? state.paymentHistory.filter(h => h._id !== id)
               : state.paymentHistory,
            isLoading: false
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to delete history', isLoading: false });
      }
   }
}));
