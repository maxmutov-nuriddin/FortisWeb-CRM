import api from './axios.api';

export const companiesApi = {
   create: (data) => api.post('/api/companies', data),
   getAll: () => api.get('/api/companies'),
   getById: (id) => api.get(`/api/companies/${id}`),
   // Удалить компанию
   delete: (id) => api.delete(`api/companies/${id}`),
   update: (id, data) => api.put(`/api/companies/${id}`, data),
   updateStatus: (id, status) => api.patch(`/api/companies/${id}/status`, { status }),
   addTeam: (id, data) => api.post(`/api/companies/${id}/teams`, data),
   addTeamMember: (id, teamId, data) => api.post(`/api/companies/${id}/teams/members`, { teamId, ...data }), // Assuming API structure, or if endpoint is literally /api/companies/:id/teams/members but that seems odd without teamId. 
   // User list: POST /api/companies/:id/teams/members
   // This likely adds a member to a team *in* the company, but where is teamId? Maybe body?
   // User provided: POST /api/companies/:id/teams/members
   addTeamMemberDirect: (id, data) => api.post(`/api/companies/${id}/teams/members`, data)
};
