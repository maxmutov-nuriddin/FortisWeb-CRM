import api from './axios.api';

export const usersApi = {
   create: (data) => api.post('/api/users', data),
   getByCompany: (companyId) => api.get(`/api/users/company/${companyId}`),
   getById: (id) => api.get(`/api/users/${id}`),
   update: (id, data) => api.put(`/api/users/${id}`, data),
   updateStatus: (id, status) => api.patch(`/api/users/${id}/status`, { status }),
   delete: (id) => api.delete(`/api/users/${id}`),
   getStats: (id) => api.get(`/api/users/${id}/stats`),
};
