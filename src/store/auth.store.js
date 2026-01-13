import { create } from 'zustand';
import Cookies from 'js-cookie';
import { authApi } from '../api/auth.api';

export const useAuthStore = create((set) => ({
   user: null,
   isAuthenticated: !!Cookies.get('token'),
   isLoading: false,
   error: null,

   register: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await authApi.register(data);
         const { token, user } = response.data;
         if (token) Cookies.set('token', token, { expires: 7, path: '/' });
         set({ user, isAuthenticated: true, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Registration failed', isLoading: false });
         throw error;
      }
   },

   login: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await authApi.login(data);
         const { token, user } = response.data;
         if (token) Cookies.set('token', token, { expires: 7, path: '/' });
         set({ user, isAuthenticated: true, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Login failed', isLoading: false });
         throw error;
      }
   },

   getMe: async () => {
      set({ isLoading: true, error: null });
      try {
         const response = await authApi.getMe();
         set({ user: response.data, isAuthenticated: true, isLoading: false });
         return response.data;
      } catch (error) {
         set({ user: null, isAuthenticated: false, isLoading: false });
      }
   },

   updateProfile: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await authApi.updateProfile(data);
         set({ user: response.data, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Update profile failed', isLoading: false });
         throw error;
      }
   },

   updatePassword: async (data) => {
      set({ isLoading: true, error: null });
      try {
         await authApi.updatePassword(data);
         set({ isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Update password failed', isLoading: false });
         throw error;
      }
   },

   changeTempPassword: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await authApi.changeTempPassword(data);
         set({ isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Change temporary password failed', isLoading: false });
         throw error;
      }
   },

   logout: () => {
      Cookies.remove('token');
      set({ user: null, isAuthenticated: false });
   },
}));
