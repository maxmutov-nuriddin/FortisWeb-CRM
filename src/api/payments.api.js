import api from './axios.api';

export const paymentsApi = {
   create: (data) => api.post('/api/payments', data),
   confirm: (id) => api.put(`/api/payments/${id}/confirm`),
   complete: (id) => api.put(`/api/payments/${id}/complete`),
   getByCompany: (companyId) => api.get(`/api/payments/company/${companyId}`),
   getByUser: (userId) => api.get(userId ? `/api/payments/user/${userId}` : '/api/payments/user'),
   getHistory: (params) => api.get('/api/payments/history/list', { params }),
   exportHistory: () => api.get('/api/payments/history/export', { responseType: 'blob' }),
   deleteHistory: (id) => api.delete(`/api/payments/history/${id}`),
   delete: (id) => api.delete(`/api/payments/${id}`),
   update: (id, data) => api.put(`/api/payments/${id}`, data),
};
