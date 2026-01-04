/* eslint-disable no-unused-vars */
import { create } from 'zustand';
import { usersApi } from '../api/users.api';

export const useUserStore = create((set) => ({
   users: [],
   selectedUser: null,
   userStats: null,
   isLoading: false,
   error: null,

   useUserStore: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.create(data);
         set((state) => ({ users: [...state.users, response.data], isLoading: false }));
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create user', isLoading: false });
         throw error;
      }
   },

   getUsersByCompany: async (companyId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.getByCompany(companyId);
         set({ users: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch users', isLoading: false });
      }
   },

   getUserById: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.getById(id);
         set({ selectedUser: response.data, isLoading: false });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch user', isLoading: false });
      }
   },

   updateUser: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.update(id, data);
         set((state) => ({
            users: state.users.map((u) => (u.id === id ? response.data : u)),
            selectedUser: state.selectedUser?.id === id ? response.data : state.selectedUser,
            isLoading: false,
         }));
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update user', isLoading: false });
         throw error;
      }
   },

   updateUserStatus: async (id, status) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.updateStatus(id, status);
         set((state) => ({
            users: state.users.map((u) => (u.id === id ? { ...u, status } : u)), // Optimistic or response based
            isLoading: false,
         }));
         // If response returns full object:
         // set((state) => ({ users: state.users.map(u => u.id === id ? response.data : u) }))
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update status', isLoading: false });
      }
   },

   deleteUser: async (id) => {
      set({ isLoading: true, error: null });
      try {
         await usersApi.delete(id);
         set((state) => ({
            users: state.users.filter((u) => u.id !== id),
            selectedUser: state.selectedUser?.id === id ? null : state.selectedUser,
            isLoading: false,
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to delete user', isLoading: false });
      }
   },

   getUserStats: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.getStats(id);
         set({ userStats: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to get stats', isLoading: false });
      }
   }
}));
