import api from './axios.api';

export const authApi = {
   register: (data) => api.post('/api/auth/register', data),
   login: (data) => api.post('/api/auth/login', data),
   getMe: () => api.get('/api/auth/me'),
   updateProfile: (data, config) => api.put('/api/auth/profile', data, config),
   updatePassword: (data) => api.put('/api/auth/password', data),
   changeTempPassword: (data) => api.put('/api/auth/change-temp-password', data),
};
