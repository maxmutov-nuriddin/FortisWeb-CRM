import api from './axios.api';

export const chatApi = {
   create: (data) => api.post('/api/chat', data),
   getAll: () => api.get('/api/chat'),
   getMessages: (chatId) => api.get(`/api/chat/${chatId}/messages`),
   sendMessage: (chatId, data) => api.post(`/api/chat/${chatId}/messages`, data),
   markRead: (chatId) => api.put(`/api/chat/${chatId}/read`),
};
