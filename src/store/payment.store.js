import { create } from 'zustand';
import { paymentsApi } from '../api/payments.api';
import { useCompanyStore } from './company.store';

export const usePaymentStore = create((set, get) => ({
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
      set({ heart: true, isLoading: true, error: null });
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
      set({ isLoading: true, error: null });
      try {
         let idsToFetch = (companyIds && companyIds.length > 0) ? companyIds : [];

         // If no IDs given, try to get them from company store
         if (idsToFetch.length === 0) {
            const companyState = useCompanyStore.getState();
            let companyList = companyState.companies?.data?.companies || (Array.isArray(companyState.companies) ? companyState.companies : []);

            if (companyList.length === 0) {
               console.log('No companies found in store, fetching...');
               const result = await companyState.getCompanies();
               companyList = result?.data?.companies || result || [];
            }

            idsToFetch = companyList.map(c => c._id || c.id).filter(Boolean);
         }

         if (idsToFetch.length === 0) {
            console.warn('Still no company IDs found, attempting single fetch...');
            // Fallback to one empty call just in case backend handles it as "all"
            const res = await paymentsApi.getByCompany('');
            const data = res.data?.data?.payments || res.data?.payments || (Array.isArray(res.data) ? res.data : []);
            set({
               payments: { data: { payments: data }, success: true },
               isLoading: false
            });
            return;
         }

         const promises = idsToFetch.map(id => paymentsApi.getByCompany(id));
         const results = await Promise.all(promises);
         let allPayments = [];
         results.forEach(res => {
            const data = res.data?.data?.payments || res.data?.payments || (Array.isArray(res.data) ? res.data : []);
            allPayments = [...allPayments, ...data];
         });

         const uniquePayments = Array.from(new Map(allPayments.map(p => [String(p._id || p.id), p])).values());
         uniquePayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

         set({
            payments: {
               data: { payments: uniquePayments },
               success: true
            },
            isLoading: false
         });
      } catch (error) {
         console.error('getAllPayments error:', error);
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
   },

   deletePayment: async (id) => {
      set({ isLoading: true, error: null });
      try {
         await paymentsApi.delete(id);
         set((state) => {
            const currentList = state.payments?.data?.payments || (Array.isArray(state.payments) ? state.payments : []);
            return {
               payments: {
                  ...state.payments,
                  data: {
                     ...state.payments?.data,
                     payments: currentList.filter((p) => String(p.id || p._id) !== String(id))
                  }
               },
               isLoading: false
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to delete payment', isLoading: false });
         throw error;
      }
   },

   deletePaymentsByProject: async (projectId, companyId) => {
      set({ isLoading: true, error: null });
      try {
         // If companyId provided, fetch latest payments to ensure we have them all
         if (companyId) {
            try {
               // We use getPaymentsByCompany from the store to update state
               await get().getPaymentsByCompany(companyId);
            } catch (fetchErr) {
               console.warn('Failed to fetch company payments before deletion:', fetchErr);
            }
         }

         const currentList = get().payments?.data?.payments || (Array.isArray(get().payments) ? get().payments : []);
         const projectPayments = currentList.filter(p => {
            const pId = p.project?._id || p.project?.id || p.project || p.projectId || p.orderId || p.order?._id || p.order || p.order_id || p.project_id;
            return String(pId || '') === String(projectId);
         });

         if (projectPayments.length > 0) {
            await Promise.all(projectPayments.map(p => paymentsApi.delete(p._id || p.id)));

            set((state) => {
               const updatedList = (state.payments?.data?.payments || []).filter(p => {
                  const pId = p.project?._id || p.project?.id || p.project || p.projectId || p.orderId || p.order?._id || p.order || p.order_id || p.project_id;
                  return String(pId || '') !== String(projectId);
               });
               return {
                  payments: {
                     ...state.payments,
                     data: {
                        ...state.payments?.data,
                        payments: updatedList
                     }
                  },
                  isLoading: false
               };
            });
         } else {
            console.log('No payments found for project:', projectId);
            set({ isLoading: false });
         }
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to delete project payments', isLoading: false });
         throw error;
      }
   },


}));
