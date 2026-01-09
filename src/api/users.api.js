import api from './axios.api';

export const usersApi = {
   create: (data) => api.post('/api/users', data),
   getByCompany: (companyId) => api.get(`/api/users/company/${companyId}`),
   getById: (id) => api.get(`/api/users/${id}`),
   update: (id, data) => api.put(`/api/users/${id}`, data),
   updateStatus: (id) => api.patch(`/api/users/${id}/status`),
   delete: (id) => api.delete(`/api/users/employee/${id}`),
   getStats: (id) => api.get(`/api/users/${id}/stats`),
   moveUser: (id, teamId) => api.put(`/api/users/employee/${id}/move`, { teamId }),
};
