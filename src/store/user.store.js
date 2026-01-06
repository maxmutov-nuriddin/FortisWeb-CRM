/* eslint-disable no-unused-vars */
import { create } from 'zustand';
import { usersApi } from '../api/users.api';

export const useUserStore = create((set) => ({
   users: [],
   selectedUser: null,
   userStats: null,
   isLoading: false,
   error: null,
   blacklistedCompanies: [],

   createUser: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.create(data);
         const newUser = response.data.data?.user || response.data;
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
      const { blacklistedCompanies } = useUserStore.getState();
      const validIds = companyIds.filter(id => !blacklistedCompanies.includes(id));

      if (validIds.length === 0) {
         if (companyIds.length > 0) {
            set({ isLoading: false });
         } else {
            set({ users: { data: { users: [] } }, isLoading: false });
         }
         return;
      }

      set({ isLoading: true, error: null });
      try {
         const promises = validIds.map(id =>
            usersApi.getByCompany(id).catch(err => {
               if (err.response?.status === 500) {
                  set(state => ({
                     blacklistedCompanies: [...state.blacklistedCompanies, id]
                  }));
               }
               console.error(`Backend Error (500) for company ${id}. This company will be blacklisted.`, err);
               return { data: { users: [], _failed: true, _companyId: id } };
            })
         );
         const results = await Promise.all(promises);
         let allUsers = [];
         results.forEach(res => {
            const data = res.data?.data?.users || res.data?.users || (Array.isArray(res.data) ? res.data : []);
            allUsers = [...allUsers, ...data];
         });
         const failedCount = results.filter(r => r.data?._failed).length;

         set(state => ({
            users: {
               data: { users: allUsers },
               success: true,
               partialFailure: failedCount > 0 || state.blacklistedCompanies.length > 0
            },
            isLoading: false
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch all users', isLoading: false });
      }
   },

   getUserById: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.getById(id);
         const user = response.data.data?.user || response.data;
         set({ selectedUser: user, isLoading: false });
         return user;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch user', isLoading: false });
      }
   },

   updateUser: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.update(id, data);
         const updatedUser = response.data.data?.user || response.data;
         set((state) => {
            const currentList = state.users?.data?.users || (Array.isArray(state.users) ? state.users : []);
            return {
               users: {
                  ...state.users,
                  data: {
                     ...state.users?.data,
                     users: currentList.map((u) => (u._id === id ? updatedUser : u))
                  }
               },
               selectedUser: state.selectedUser?._id === id ? updatedUser : state.selectedUser,
               isLoading: false
            };
         });
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update user', isLoading: false });
         throw error;
      }
   },

   updateUserStatus: async (id) => {
      set({ isLoading: true, error: null });
      try {
         const response = await usersApi.updateStatus(id);
         const updatedUser = response.data.data?.user || response.data;
         set((state) => {
            const currentList = state.users?.data?.users || (Array.isArray(state.users) ? state.users : []);
            return {
               users: {
                  ...state.users,
                  data: {
                     ...state.users?.data,
                     users: currentList.map(u => u._id === id ? updatedUser : u)
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
                     users: currentList.filter((u) => u._id !== id)
                  }
               },
               selectedUser: state.selectedUser?._id === id ? null : state.selectedUser,
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
         set({ userStats: response.data.data || response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to get stats', isLoading: false });
      }
   }
}));
