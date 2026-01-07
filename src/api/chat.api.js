import api from './axios.api';

export const chatApi = {
   create: (data) => api.post('/api/chat', data),
   getAll: () => api.get('/api/chat'),
   getMessages: (chatId) => api.get(`/api/chat/${chatId}/messages`),
   sendMessage: (chatId, data) => api.post(`/api/chat/${chatId}/messages`, data),
   updateMessage: (chatId, messageId, data) => api.put(`/api/chat/${chatId}/messages/${messageId}`, data),
   deleteMessage: (chatId, messageId) => api.delete(`/api/chat/${chatId}/messages/${messageId}`),
   markRead: (chatId) => api.put(`/api/chat/${chatId}/read`),
   clearChat: (chatId) => api.delete(`/api/chat/${chatId}/clear`),
};
