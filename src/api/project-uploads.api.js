import api from './axios.api';

const BASE_URL = '/api/uploads';

export const projectUploadsApi = {
   upload: (formData) => api.post(`${BASE_URL}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
   }),
   getAll: (params) => api.get(`${BASE_URL}`, { params }),
   edit: (id, data) => {
      const isFormData = data instanceof FormData;
      return api.put(`${BASE_URL}/${id}`, data, {
         headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
      });
   },
   delete: (id) => api.delete(`${BASE_URL}/${id}`),
   download: (id) => api.get(`${BASE_URL}/${id}/download`, { responseType: 'blob' }),
};
