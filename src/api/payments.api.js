import api from './axios.api';

export const paymentsApi = {
   create: (data) => api.post('/api/payments', data),
   confirm: (id) => api.put(`/api/payments/${id}/confirm`),
   complete: (id) => api.put(`/api/payments/${id}/complete`),
   update: (id, data) => api.put(`/api/payments/${id}`, data),
   getByCompany: (companyId) => api.get(`/api/payments/company/${companyId}`),
   getByUser: (userId) => api.get(`/api/payments/user/${userId || ''}`),
   getHistory: (params) => api.get('/api/payments/history/list', { params }),
   exportHistory: (params) => api.get('/api/payments/history/export', { params, responseType: 'blob' }),
   delete: (id) => api.delete(`/api/payments/${id}`),
   getSalaries: (paymentId) => api.get(`/api/payments/${paymentId}/salaries`),
};
