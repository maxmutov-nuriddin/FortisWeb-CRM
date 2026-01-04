import { create } from 'zustand';
import { tasksApi } from '../api/tasks.api';

export const useTaskStore = create((set) => ({
   tasks: [],
   selectedTask: null,
   isLoading: false,
   error: null,

   createTask: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.create(data);
         set((state) => ({ tasks: [...state.tasks, response.data], isLoading: false }));
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create task', isLoading: false });
         throw error;
      }
   },

   getTasksByProject: async (projectId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.getByProject(projectId);
         set({ tasks: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch tasks', isLoading: false });
      }
   },

   getTasksByUser: async (userId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.getByUser(userId);
         set({ tasks: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch user tasks', isLoading: false });
      }
   },

   updateTaskStatus: async (id, status) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.updateStatus(id, status);
         set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? response.data : t)),
            // If selectedTask is the one updated
            selectedTask: state.selectedTask?.id === id ? response.data : state.selectedTask,
            isLoading: false,
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update task status', isLoading: false });
      }
   },

   addTaskComment: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.addComment(id, data);
         // Assuming response returns the comment or the updated task
         // If it returns the updated task:
         set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? response.data : t),
            selectedTask: state.selectedTask?.id === id ? response.data : state.selectedTask,
            isLoading: false
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add comment', isLoading: false });
      }
   }
}));
