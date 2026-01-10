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
         const newTask = response.data.data?.task || response.data.task || response.data;
         set((state) => ({
            tasks: Array.isArray(state.tasks) ? [...state.tasks, newTask] : [newTask],
            isLoading: false
         }));
         return newTask;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create task', isLoading: false });
         throw error;
      }
   },

   updateTask: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.update(id, data);
         const updatedTask = response.data.data?.task || response.data.task || response.data;
         set((state) => ({
            tasks: Array.isArray(state.tasks)
               ? state.tasks.map(t => (t._id === id || t.id === id) ? updatedTask : t)
               : state.tasks,
            selectedTask: (state.selectedTask?._id === id || state.selectedTask?.id === id) ? updatedTask : state.selectedTask,
            isLoading: false
         }));
         return updatedTask;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update task', isLoading: false });
         throw error;
      }
   },

   deleteTask: async (id) => {
      set({ isLoading: true, error: null });
      try {
         await tasksApi.delete(id);
         set((state) => ({
            tasks: Array.isArray(state.tasks)
               ? state.tasks.filter(t => t._id !== id && t.id !== id)
               : state.tasks,
            selectedTask: (state.selectedTask?._id === id || state.selectedTask?.id === id) ? null : state.selectedTask,
            isLoading: false
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to delete task', isLoading: false });
         throw error;
      }
   },

   getTasksByProject: async (projectId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.getByProject(projectId);
         const tasks = response.data.data?.tasks || response.data.tasks || response.data;
         set({ tasks, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch tasks', isLoading: false });
      }
   },

   getTasksByUser: async (userId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.getByUser(userId);
         const tasks = response.data.data?.tasks || response.data.tasks || response.data;
         set({ tasks, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch user tasks', isLoading: false });
      }
   },

   getTasksByCompany: async (companyId) => {
      // If this endpoint is 404, we'll need to fetch projects first and then tasks.
      // Handled in the UI for now, but keeping the action for compatibility if backend ever implements it.
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.getByCompany(companyId);
         const tasks = response.data.data?.tasks || response.data.tasks || response.data;
         set({ tasks, isLoading: false });
      } catch (error) {
         if (error.response?.status === 404) {
            console.warn('getTasksByCompany 404, use getTasksByProjects instead');
         }
         set({ error: error.response?.data?.message || 'Failed to fetch company tasks', isLoading: false });
      }
   },

   getAllTasks: async () => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.getAll();
         const tasks = response.data.data?.tasks || response.data.tasks || response.data;
         set({ tasks, isLoading: false });
      } catch (error) {
         if (error.response?.status === 404) {
            console.warn('getAllTasks endpoint not found, returning empty list');
            set({ tasks: [], isLoading: false });
         } else {
            set({ error: error.response?.data?.message || 'Failed to fetch all tasks', isLoading: false });
         }
      }
   },

   updateTaskStatus: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.updateStatus(id, data);
         const updatedTask = response.data.data?.task || response.data.task || response.data;
         set((state) => ({
            tasks: Array.isArray(state.tasks)
               ? state.tasks.map((t) => (t._id === id || t.id === id) ? updatedTask : t)
               : state.tasks,
            selectedTask: (state.selectedTask?._id === id || state.selectedTask?.id === id) ? updatedTask : state.selectedTask,
            isLoading: false,
         }));
         return updatedTask;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update task status', isLoading: false });
         throw error;
      }
   },

   reorderTasks: async (data) => {
      set({ isLoading: true, error: null });
      try {
         await tasksApi.reorderTasks(data);
         set({ isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to reorder tasks', isLoading: false });
         throw error;
      }
   },

   addSubtask: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.addSubtask(id, data);
         const updatedTask = response.data.data?.task || response.data.task || response.data;
         set((state) => ({
            tasks: Array.isArray(state.tasks)
               ? state.tasks.map(t => (t._id === id || t.id === id) ? updatedTask : t)
               : state.tasks,
            selectedTask: (state.selectedTask?._id === id || state.selectedTask?.id === id) ? updatedTask : state.selectedTask,
            isLoading: false
         }));
         return updatedTask;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add subtask', isLoading: false });
         throw error;
      }
   },

   addAttachment: async (id, file) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.addAttachment(id, file);
         const updatedTask = response.data.data?.task || response.data.task || response.data;
         set((state) => ({
            tasks: Array.isArray(state.tasks)
               ? state.tasks.map(t => (t._id === id || t.id === id) ? updatedTask : t)
               : state.tasks,
            selectedTask: (state.selectedTask?._id === id || state.selectedTask?.id === id) ? updatedTask : state.selectedTask,
            isLoading: false
         }));
         return updatedTask;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add attachment', isLoading: false });
         throw error;
      }
   },

   addDependency: async (id, dependencyId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.addDependency(id, dependencyId);
         const updatedTask = response.data.data?.task || response.data.task || response.data;
         set((state) => ({
            tasks: Array.isArray(state.tasks)
               ? state.tasks.map(t => (t._id === id || t.id === id) ? updatedTask : t)
               : state.tasks,
            selectedTask: (state.selectedTask?._id === id || state.selectedTask?.id === id) ? updatedTask : state.selectedTask,
            isLoading: false
         }));
         return updatedTask;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add dependency', isLoading: false });
         throw error;
      }
   },

   updateTaskWeight: async (id, weight) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.updateWeight(id, weight);
         const updatedTask = response.data.data?.task || response.data.task || response.data;
         set((state) => ({
            tasks: Array.isArray(state.tasks)
               ? state.tasks.map((t) => (t._id === id || t.id === id) ? updatedTask : t)
               : state.tasks,
            selectedTask: (state.selectedTask?._id === id || state.selectedTask?.id === id) ? updatedTask : state.selectedTask,
            isLoading: false,
         }));
         return updatedTask;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to update task weight', isLoading: false });
         throw error;
      }
   },

   addTaskComment: async (id, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await tasksApi.addComment(id, data);
         const updatedTask = response.data.data?.task || response.data.task || response.data;
         set((state) => ({
            tasks: Array.isArray(state.tasks)
               ? state.tasks.map(t => (t._id === id || t.id === id) ? updatedTask : t)
               : state.tasks,
            selectedTask: (state.selectedTask?._id === id || state.selectedTask?.id === id) ? updatedTask : state.selectedTask,
            isLoading: false
         }));
         return updatedTask;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to add comment', isLoading: false });
         throw error;
      }
   },

   getTasksByProjects: async (projectIds) => {
      if (!projectIds || projectIds.length === 0) {
         set({ tasks: [], isLoading: false });
         return;
      }
      set({ isLoading: true, error: null });
      try {
         const promises = projectIds.map(id => tasksApi.getByProject(id).catch(err => {
            console.error(`Error fetching tasks for project ${id}:`, err);
            return { data: { tasks: [] } };
         }));
         const results = await Promise.all(promises);
         let allTasks = [];
         results.forEach(res => {
            const data = res.data?.data?.tasks || res.data?.tasks || (Array.isArray(res.data) ? res.data : []);
            allTasks = [...allTasks, ...data];
         });
         set({ tasks: allTasks, isLoading: false });
      // eslint-disable-next-line no-unused-vars
      } catch (error) {
         set({ error: 'Failed to fetch tasks for projects', isLoading: false });
      }
   }
}));
