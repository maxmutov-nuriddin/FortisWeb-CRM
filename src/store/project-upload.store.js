import { create } from 'zustand';
import { projectUploadsApi } from '../api/project-uploads.api';

export const useProjectUploadStore = create((set) => ({
   uploads: [],
   isLoading: false,
   error: null,

   uploadFile: async (formData) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectUploadsApi.upload(formData);
         set((state) => ({
            uploads: [response.data.data?.file, ...state.uploads],
            isLoading: false
         }));
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to upload file', isLoading: false });
         throw error;
      }
   },

   getFiles: async (params) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectUploadsApi.getAll(params);
         set({ uploads: response.data.data?.files || [], isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch files', isLoading: false });
      }
   },

   deleteFile: async (id) => {
      set({ isLoading: true, error: null });
      try {
         await projectUploadsApi.delete(id);
         set((state) => ({
            uploads: state.uploads.filter(f => f._id !== id),
            isLoading: false
         }));
      } catch (error) {
         set({ isLoading: false, error: error.response?.data?.message || 'Failed to delete file' });
         throw error;
      }
   },

   editFile: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await projectUploadsApi.edit(id, data);
         const updatedFile = response.data.data?.file;
         set((state) => ({
            uploads: state.uploads.map(f => f._id === id ? updatedFile : f),
            isLoading: false
         }));
         return response.data;
      } catch (error) {
         set({ isLoading: false, error: error.response?.data?.message || 'Failed to edit file' });
         throw error;
      }
   }
}));
