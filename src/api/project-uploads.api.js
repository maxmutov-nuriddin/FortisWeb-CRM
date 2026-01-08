import api from './axios.api';

const BASE_URL = '/api/uploads';

export const projectUploadsApi = {
   upload: (formData) => api.post(`${BASE_URL}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
   }),
   getAll: (params) => api.get(`${BASE_URL}`, { params }),
   edit: (id, data) => api.put(`${BASE_URL}/${id}`, data),
   delete: (id) => api.delete(`${BASE_URL}/${id}`),
   download: (id) => api.get(`${BASE_URL}/${id}/download`, { responseType: 'blob' }),
};
