import api from './axios.api';

export const projectsApi = {
   create: (data) => api.post('/api/projects', data),
   getAll: () => api.get('/api/projects'),
   getByCompany: (companyId) => api.get(`/api/projects/company/${companyId}`),
   getById: (id) => api.get(`/api/projects/${id}`),
   update: (id, data) => api.put(`/api/projects/${id}`, data),
   delete: (id) => api.delete(`/api/projects/${id}`),
   assign: (id, data) => api.put(`/api/projects/${id}/assign`, data),
   updateWorkPercentage: (id, percentage) => api.put(`/api/projects/${id}/work-percentage`, { percentage }), // or body
   addResults: (id, data) => api.post(`/api/projects/${id}/results`, data),
   requestRevision: (id, data) => api.post(`/api/projects/${id}/revision`, data),
   complete: (id) => api.put(`/api/projects/${id}/complete`),
   accept: (id, data) => api.post(`/api/projects/${id}/accept`, data),
   updateStatusFlags: (id, data) => api.put(`/api/projects/${id}/status-flags`, data),
   getOrderHistory: () => api.get('/api/projects/history/all'),
};
