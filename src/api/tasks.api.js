import api from './axios.api';

export const tasksApi = {
   create: (data) => api.post('/api/tasks', data),
   update: (id, data) => api.put(`/api/tasks/${id}`, data),
   delete: (id) => api.delete(`/api/tasks/${id}`),
   getByProject: (projectId) => api.get(`/api/tasks/project/${projectId}`),
   getByUser: (userId) => api.get(userId ? `/api/tasks/user/${userId}` : '/api/tasks/user'),
   updateStatus: (id, data) => api.put(`/api/tasks/${id}/status`, data), // status, actualHours
   reorderTasks: (data) => api.put('/api/tasks/reorder', data), // taskId, newOrder, newStatus
   addSubtask: (id, data) => api.post(`/api/tasks/${id}/subtasks`, data), // title
   addAttachment: (id, file) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/api/tasks/${id}/attachments`, formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });
   },
   addDependency: (id, dependencyId) => api.post(`/api/tasks/${id}/dependencies`, { dependencyId }),
   addComment: (id, data) => api.post(`/api/tasks/${id}/comments`, data), // text
   updateWeight: (id, weight) => api.put(`/api/tasks/${id}/weight`, { weight }),
};
