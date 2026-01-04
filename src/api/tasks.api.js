import api from './axios.api';

export const tasksApi = {
   create: (data) => api.post('/api/tasks', data),
   getByProject: (projectId) => api.get(`/api/tasks/project/${projectId}`),
   getByUser: (userId) => api.get(userId ? `/api/tasks/user/${userId}` : '/api/tasks/user'),
   updateStatus: (id, status) => api.put(`/api/tasks/${id}/status`, { status }),
   addComment: (id, data) => api.post(`/api/tasks/${id}/comments`, data),
};
