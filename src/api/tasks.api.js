import api from './axios.api';

export const tasksApi = {
   create: (data) => api.post('/api/tasks', data),
   update: (id, data) => api.put(`/api/tasks/${id}`, data),
   delete: (id) => api.delete(`/api/tasks/${id}`),
   getByProject: (projectId) => api.get(`/api/tasks/project/${projectId}`),
   getByUser: (userId) => api.get(userId ? `/api/tasks/user/${userId}` : '/api/tasks/user'),
   getByCompany: (companyId) => api.get(`/api/tasks/company/${companyId}`),
   getAll: () => api.get('/api/tasks'),
   updateStatus: (id, status) => api.put(`/api/tasks/${id}/status`, { status }),
   updateWeight: (id, weight) => api.put(`/api/tasks/${id}/weight`, { weight }),
   addComment: (id, text) => api.post(`/api/tasks/${id}/comments`, { text }),
};
