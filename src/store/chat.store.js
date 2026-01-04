import { create } from 'zustand';
import { chatApi } from '../api/chat.api';

export const useChatStore = create((set) => ({
   chats: [],
   selectedChat: null,
   messages: [],
   isLoading: false,
   error: null,

   createChat: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await chatApi.create(data);
         set((state) => ({ chats: [...state.chats, response.data], isLoading: false }));
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create chat', isLoading: false });
         throw error;
      }
   },

   getAllChats: async () => {
      set({ isLoading: true, error: null });
      try {
         const response = await chatApi.getAll();
         set({ chats: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch chats', isLoading: false });
      }
   },

   getChatMessages: async (chatId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await chatApi.getMessages(chatId);
         // Assuming response.data is array of messages
         set({ messages: response.data, isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch messages', isLoading: false });
      }
   },

   sendMessage: async (chatId, data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await chatApi.sendMessage(chatId, data);
         set((state) => ({
            messages: [...state.messages, response.data],
            isLoading: false,
         }));
         return response.data;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to send message', isLoading: false });
         throw error;
      }
   },

   markChatRead: async (chatId) => {
      try {
         await chatApi.markRead(chatId);
         // Optional: Update local state to reflect read status
         set((state) => ({
            chats: state.chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c) // Example
         }));
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to mark as read', isLoading: false });
      }
   },

   selectChat: (chatId) => {
      set((state) => ({
         selectedChat: state.chats.find(c => c.id === chatId) || null,
         messages: [] // Clear messages on switch? Or keep cache?
      }));
   }
}));
