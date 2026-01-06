/* eslint-disable no-unused-vars */
import { create } from 'zustand';
import { usersApi } from '../api/users.api';

export const useUserStore = create((set) => ({
   users: [],
   selectedUser: null,
   userStats: null,
   isLoading: false,
   error: null,

   createUser: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.create(data);
         const newUser = response.data;
         set((state) => {
            const currentList = state.users?.data?.users || (Array.isArray(state.users) ? state.users : []);
            return {
               users: {
                  ...state.users,
                  data: {
                     ...state.users?.data,
                     users: [...currentList, newUser]
                  }
               },
               isLoading: false
            };
         });
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
         const data = response.data?.data?.users || response.data?.users || (Array.isArray(response.data) ? response.data : []);
         set({
            users: {
               data: { users: data },
               success: true
            },
            isLoading: false
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch users', isLoading: false });
      }
   },

   getAllUsers: async (companyIds) => {
      if (!companyIds || companyIds.length === 0) {
         set({ users: [], isLoading: false });
         return;
      }
      set({ isLoading: true, error: null });
      try {
         const promises = companyIds.map(id => usersApi.getByCompany(id));
         const results = await Promise.all(promises);
         let allUsers = [];
         results.forEach(res => {
            const data = res.data?.data?.users || res.data?.users || (Array.isArray(res.data) ? res.data : []);
            allUsers = [...allUsers, ...data];
         });
         set({
            users: {
               data: { users: allUsers },
               success: true
            },
            isLoading: false
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch all users', isLoading: false });
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
         const updatedUser = response.data;
         set((state) => {
            const currentList = state.users?.data?.users || (Array.isArray(state.users) ? state.users : []);
            return {
               users: {
                  ...state.users,
                  data: {
                     ...state.users?.data,
                     users: currentList.map((u) => (u.id === id || u._id === id ? updatedUser : u))
                  }
               },
               selectedUser: (state.selectedUser?.id === id || state.selectedUser?._id === id) ? updatedUser : state.selectedUser,
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update user', isLoading: false });
         throw error;
      }
   },

   updateUserStatus: async (id, status) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.updateStatus(id, { isActive: status });
         set((state) => {
            const currentList = state.users?.data?.users || (Array.isArray(state.users) ? state.users : []);
            return {
               users: {
                  ...state.users,
                  data: {
                     ...state.users?.data,
                     users: currentList.map(u => (u.id === id || u._id === id) ? { ...u, isActive: status } : u)
                  }
               },
               isLoading: false
            };
         });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update status', isLoading: false });
      }
   },

   deleteUser: async (id) => {
      set({ isLoading: true, error: null });
      try {
         await usersApi.delete(id);
         set((state) => {
            const currentList = state.users?.data?.users || (Array.isArray(state.users) ? state.users : []);
            return {
               users: {
                  ...state.users,
                  data: {
                     ...state.users?.data,
                     users: currentList.filter((u) => (u.id !== id && u._id !== id))
                  }
               },
               selectedUser: (state.selectedUser?.id === id || state.selectedUser?._id === id) ? null : state.selectedUser,
               isLoading: false
            };
         });
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
