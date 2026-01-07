import api from './axios.api';

export const paymentsApi = {
   create: (data) => api.post('/api/payments', data),
   confirm: (id) => api.put(`/api/payments/${id}/confirm`),
   complete: (id) => api.put(`/api/payments/${id}/complete`),
   update: (id, data) => api.put(`/api/payments/${id}`, data),
   getByCompany: (companyId) => api.get(`/api/payments/company/${companyId}`),
   getByUser: (userId) => api.get(userId ? `/api/payments/user/${userId}` : '/api/payments/user'),
};
