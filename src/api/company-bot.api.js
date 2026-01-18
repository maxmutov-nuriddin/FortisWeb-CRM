import api from './axios.api';

export const companyBotApi = {
   connect: (token) => api.post('/api/company/bot/connect', { token }),
   disable: () => api.post('/api/company/bot/disable'),
   getStatus: () => api.get('/api/company/bot/status')
};
