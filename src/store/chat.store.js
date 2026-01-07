import { create } from 'zustand';
import { chatApi } from '../api/chat.api';

export const useChatStore = create((set, get) => ({
   chats: [],
   selectedChat: null,
   messages: [],
   isLoading: false,
   error: null,

   createChat: async (data) => {
      set({ isLoading: true, error: null });
      try {
         const response = await chatApi.create(data);
         // Backend returns { success: true, data: { chat: {...} } }
         const newChat = response.data?.data?.chat || response.data?.chat || response.data;
         set((state) => ({ chats: [...state.chats, newChat], isLoading: false }));
         return newChat;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to create chat', isLoading: false });
         throw error;
      }
   },

   getAllChats: async () => {
      set({ isLoading: true, error: null });
      try {
         const response = await chatApi.getAll();
         // Backend returns { success: true, data: { chats: [], count: 0 } }
         const chatList = response.data?.data?.chats || response.data?.chats || [];
         set({ chats: Array.isArray(chatList) ? chatList : [], isLoading: false });
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch chats', isLoading: false });
      }
   },

   getChatMessages: async (chatId) => {
      set({ isLoading: true, error: null });
      try {
         const response = await chatApi.getMessages(chatId);
         // Backend returns { success: true, data: { chat: {}, messages: [] } }
         const msgs = response.data?.data?.messages || response.data?.messages || [];

         // Fix race condition: Only set messages if this is still the selected chat
         if (get().selectedChat?._id === chatId) {
            set({ messages: Array.isArray(msgs) ? msgs : [], isLoading: false });
         } else {
            // If we switched away, do nothing (prevent bleeding)
            set({ isLoading: false });
         }
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to fetch messages', isLoading: false });
      }
   },

   sendMessage: async (chatId, data) => {
      try {
         const response = await chatApi.sendMessage(chatId, data);
         // Backend returns { success: true, data: { message: {...} } }
         const newMsg = response.data?.data?.message || response.data?.message || response.data;

         set((state) => {
            if (state.selectedChat?._id === chatId) {
               return { messages: [...state.messages, newMsg] };
            }
            return {};
         });
         return newMsg;
      } catch (error) {
         set({ error: error.response?.data?.message || 'Failed to send message' });
         throw error;
      }
   },

   editMessage: async (chatId, messageId, text) => {
      try {
         const response = await chatApi.updateMessage(chatId, messageId, { text });
         set((state) => ({
            messages: state.messages.map(m =>
               (m._id === messageId || m.id === messageId) ? response.data : m
            )
         }));
         return response.data;
      } catch (error) {
         console.error('Edit message failed:', error);
         throw error;
      }
   },

   deleteMessage: async (chatId, messageId) => {
      try {
         await chatApi.deleteMessage(chatId, messageId);
         set((state) => ({
            messages: state.messages.filter(m => m._id !== messageId && m.id !== messageId)
         }));
      } catch (error) {
         console.error('Delete message failed:', error);
         throw error;
      }
   },

   clearChat: async (chatId) => {
      try {
         await chatApi.clearChat(chatId);
         set({ messages: [] });
      } catch (error) {
         console.error('Clear chat failed:', error);
         throw error;
      }
   },

   markChatRead: async (chatId) => {
      try {
         await chatApi.markRead(chatId);
         set((state) => ({
            chats: state.chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c)
         }));
      } catch (error) {
         console.error('Mark read failed:', error);
      }
   },

   selectChat: (chatOrId) => {
      const chatId = typeof chatOrId === 'string' ? chatOrId : (chatOrId._id || chatOrId.id);
      const chatObj = typeof chatOrId === 'object' ? chatOrId : get().chats.find(c => c.id === chatId || c._id === chatId);

      set({
         selectedChat: chatObj || null,
         messages: [], // Reset messages while loading new ones
         error: null
      });

      if (chatId) {
         get().getChatMessages(chatId);
      }
   }
}));
