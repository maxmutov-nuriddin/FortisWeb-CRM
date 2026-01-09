import api from './axios.api';

export const companiesApi = {
   create: (data) => api.post('/api/companies', data),
   getAll: () => api.get('/api/companies'),
   getById: (id) => api.get(`/api/companies/${id}`),
   delete: (id) => api.delete(`/api/companies/${id}`),
   update: (id, data) => api.put(`/api/companies/${id}`, data),
   updateStatus: (id) => api.patch(`/api/companies/${id}/status`),
   addTeam: (id, data) => api.post(`/api/companies/${id}/teams`, data),
   addTeamMember: (id, data) => api.post(`/api/companies/${id}/teams/members`, data),
   addTeamMemberDirect: (id, data) => api.post(`/api/companies/${id}/teams/members`, data),
   deleteTeam: (id, teamId) => api.delete(`/api/companies/${id}/teams/${teamId}`),
   updateSubscription: (id, type) => api.post(`/api/companies/${id}/subscription`, { type }),
   updateDistributionRates: (id, data) => api.put(`/api/companies/${id}/distribution-rates`, data)
};
