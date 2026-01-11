/* eslint-disable react-hooks/immutability */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useChatStore } from '../store/chat.store';
import { useAuthStore } from '../store/auth.store';
import { useUserStore } from '../store/user.store';
import PageLoader from '../components/loader/PageLoader';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const Chat = () => {
   const { t } = useTranslation();
   const { user } = useAuthStore();
   const {
      chats,
      messages,
      selectedChat,
      getAllChats,
      getChatMessages,
      sendMessage,
      createChat,
      selectChat,
      editMessage,
      deleteMessage,
      clearChat,
      isLoading,
   } = useChatStore();

   const { users, getUsersByCompany } = useUserStore();

   const userData = user?.data?.user || user;
   const IsSuperAdmin = userData?.role === 'super_admin';
   const IsCompanyAdmin = userData?.role === 'company_admin';
   // eslint-disable-next-line no-unused-vars
   const isAdmin = IsSuperAdmin || IsCompanyAdmin;

   const [messageInput, setMessageInput] = useState('');
   const [activeTab, setActiveTab] = useState(IsSuperAdmin ? 'support' : 'global'); // global, team, support
   const [editingMessageId, setEditingMessageId] = useState(null);
   const [editInput, setEditInput] = useState('');
   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
   const fileInputRef = useRef(null);
   const messagesEndRef = useRef(null);

   const userMap = useMemo(() => {
      const allUsers = users?.data?.users || (Array.isArray(users) ? users : []);
      const map = new Map();
      allUsers.forEach(u => {
         if (u._id) map.set(u._id, u);
         if (u.id) map.set(u.id, u);
      });
      if (userData?._id) map.set(userData._id, userData);
      return map;
   }, [users, userData]);

   useEffect(() => {
      getAllChats();
   }, [getAllChats]);

   const attemptRef = useRef(new Set());

   useEffect(() => {
      const initChat = async () => {
         if (Array.isArray(chats) && !isLoading && userData?._id) {
            let targetChat = null;
            const companyId = userData.company?._id || userData.company || null;
            const teamId = userData.team?._id || userData.team || userData.assignedTeam?._id || userData.assignedTeam || null;

            const createPayload = { participants: [userData._id] };
            if (companyId && typeof companyId === 'string') createPayload.company = companyId;

            const attemptKey = `${activeTab}-${companyId || 'no-comp'}-${teamId || 'no-team'}`;

            const getParticipants = async () => {
               if (!companyId) return [userData._id];
               if (userMap.size > 1) {
                  return Array.from(userMap.keys());
               }
               try {
                  const res = await getUsersByCompany(companyId);
                  const allUsers = res?.data?.users || [];
                  const ids = allUsers.map(u => u._id).filter(id => id);
                  if (!ids.includes(userData._id)) ids.push(userData._id);
                  return ids;
               } catch (err) {
                  console.error("Failed to fetch participants", err);
                  return [userData._id];
               }
            };

            if (activeTab === 'global') {
               targetChat = chats.find(c => (c.type === 'team' && c.name === 'Company Global'));
               if (!targetChat && !isLoading && companyId && !attemptRef.current.has(attemptKey)) {
                  attemptRef.current.add(attemptKey);
                  const ids = await getParticipants();
                  createChat({ ...createPayload, type: 'team', name: 'Company Global', participants: ids })
                     .then((newChat) => selectChat(newChat)).catch(err => console.error("Global init failed", err));
                  return;
               }
            } else if (activeTab === 'team') {
               // Filter for team chat that matches user's team if possible, or generic name
               targetChat = chats.find(c => (c.type === 'team' && c.team === teamId));

               // Only Team Lead or Company Admin (if in team) can create. 
               // REQUIRED: teamId must exist.
               if (!targetChat && (userData?.role === 'team_lead' || (IsCompanyAdmin && teamId)) && teamId && companyId && !attemptRef.current.has(attemptKey)) {
                  attemptRef.current.add(attemptKey);
                  // For team chat, we might want only team members? 
                  // For now, logic fetches all company users. This might be too broad for "Team Chat" (Isolation rule).
                  // Ideally "getTeamMembers". But keeping existing logic for participants unless specifically asked to change participant fetch logic.
                  // Wait, strict rule: "Team chat: Only same team members". 
                  // If we use 'getParticipants' (all company users), we violate this.
                  // We should filter participants by teamId if possible.
                  // But 'users' store might identify teams.
                  // For minimal change, we proceed, but correct backend validates participants? 
                  // Backend `createChat` checks: "participants belong to teamId".
                  // So we MUST filter participants here or let Backend handle it (backend might reject if we send all company users).
                  // Let's rely on Backend to validate or we pass only self?
                  // Better: pass ONLY self in `participants`. Admin can add others? Or Backend auto-adds team members?
                  // ChatController `createChat` doesn't auto-add team members.
                  // Let's just create with self and let user add others? Or try to find team members.
                  // Given "Frontend Integration" task, I will just fix the `teamId` param.

                  createChat({ ...createPayload, type: 'team', name: 'Department Team', teamId: teamId }) // Removed explicit participants to let backend handle or user add? 
                     // Wait, previous code sent `ids` (all company). This WILL fail backend check.
                     // I will send `[userData._id]` as participants, plus `teamId`.
                     .then((newChat) => selectChat(newChat)).catch(err => console.error("Team init failed", err));
                  return;
               }
            } else if (activeTab === 'support') {
               if (IsSuperAdmin) return;
               if (IsCompanyAdmin) {
                  const supportName = `Support - ${userData.name}`;
                  targetChat = chats.find(c => c.name === supportName);
                  if (!targetChat && !attemptRef.current.has(attemptKey)) {
                     attemptRef.current.add(attemptKey);
                     // Support chat: Company Admin + Super Admins.
                     // Backend `createChat` for type='support' auto-sets participants.
                     // So we don't need to fetch company users.
                     createChat({ ...createPayload, type: 'support', name: supportName, participants: [userData._id] })
                        .then((newChat) => selectChat(newChat)).catch(err => console.error("Support init failed", err));
                     return;
                  }
               } else {
                  selectChat(null);
               }
            }

            if (targetChat) {
               if (selectedChat?._id !== targetChat._id) {
                  selectChat(targetChat);
               }
            }
         }
      };
      initChat();
   }, [activeTab, chats, isLoading, userData, getUsersByCompany, IsSuperAdmin, IsCompanyAdmin, userMap]);

   const getUserInfo = (sender) => {
      const senderId = sender?._id || sender;
      if (userMap.has(senderId)) return userMap.get(senderId);
      if (sender?.role) return sender;
      return { name: 'Unknown', role: 'user' };
   };

   const formatRole = (role) => {
      if (!role) return t('employee_role', 'Employee');
      if (role === 'user') return t('employee_role', 'Employee');
      if (role === 'company_admin') return t('company_admin');
      if (role === 'super_admin') return t('support_agent', 'Support Agent');
      if (role === 'team_lead') return t('team_lead');
      return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
   };

   useEffect(() => {
      scrollToBottom();
   }, [messages]);

   useEffect(() => {
      let interval;
      if (selectedChat?._id) {
         getChatMessages(selectedChat._id);
         interval = setInterval(() => {
            getChatMessages(selectedChat._id);
            getAllChats();
         }, 3000);
      } else {
         interval = setInterval(() => {
            getAllChats();
         }, 5000);
      }
      return () => clearInterval(interval);
   }, [selectedChat?._id, getChatMessages]);

   const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
   };

   const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!messageInput.trim()) return;
      if (!selectedChat) {
         toast.error("No chat selected.", { position: 'top-right', theme: 'dark' });
         return;
      }
      try {
         await sendMessage(selectedChat._id, { text: messageInput });
         setMessageInput('');
         setShowEmojiPicker(false);
      } catch (error) {
         console.error(error);
         toast.error(error.response?.data?.message || 'Failed to send message');
      }
   };

   const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!selectedChat) {
         toast.error("No chat selected.");
         return;
      }
      toast.info(`Uploading: ${file.name}`);
   };

   const insertEmoji = (emoji) => {
      setMessageInput(prev => prev + emoji);
      setShowEmojiPicker(false);
   };

   const handleEditStart = (msg) => {
      setEditingMessageId(msg._id);
      setEditInput(msg.text);
   };

   const handleEditSave = async (msgId) => {
      try {
         await editMessage(selectedChat._id, msgId, editInput);
         setEditingMessageId(null);
         setEditInput('');
      } catch (error) {
         toast.error(error.response?.data?.message || 'Failed to edit message');
      }
   };

   const handleDelete = async (msgId) => {
      if (window.confirm('Delete this message?')) {
         try {
            await deleteMessage(selectedChat._id, msgId);
            toast.success('Deleted');
         } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete');
         }
      }
   };

   const handleClearChat = async () => {
      if (window.confirm('Delete chat history?')) {
         try {
            await clearChat(selectedChat._id);
            toast.success('Chat cleared');
            getChatMessages(selectedChat._id);
         } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to clear chat');
         }
      }
   };

   if (isLoading && !selectedChat && !IsSuperAdmin) return <PageLoader />;

   const supportChats = IsSuperAdmin ? chats.filter(c => c.name.startsWith('Support - ')) : [];
   const showRestrictedAccess = activeTab === 'support' && !IsSuperAdmin && !IsCompanyAdmin;

   return (
      <div className="flex h-[calc(100vh-80px)] overflow-hidden p-6 gap-6 bg-gray-50/50 dark:bg-black font-sans">
         {/* Sidebar */}
         <div className="w-80 shrink-0 flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl flex flex-col shadow-sm overflow-hidden h-full">
               <div className="p-6 border-b border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">{t('messages_sidebar_title')}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">{t('team_collaboration_desc')}</p>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {!IsSuperAdmin && (
                     <>
                        <button
                           onClick={() => setActiveTab('global')}
                           className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 border ${activeTab === 'global' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800'}`}
                        >
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'global' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400'}`}>
                              <i className="fa-solid fa-globe text-sm"></i>
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{t('company_global')}</p>
                              <p className="text-[10px] font-medium opacity-70 truncate">{t('public_channel_desc')}</p>
                           </div>
                        </button>

                        <button
                           onClick={() => setActiveTab('team')}
                           className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 border ${activeTab === 'team' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800'}`}
                        >
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'team' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400'}`}>
                              <i className="fa-solid fa-users text-sm"></i>
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{t('department_team')}</p>
                              <p className="text-[10px] font-medium opacity-70 truncate">{t('private_updates_desc')}</p>
                           </div>
                        </button>
                     </>
                  )}

                  <button
                     onClick={() => setActiveTab('support')}
                     className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 border ${activeTab === 'support' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800'}`}
                  >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'support' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400'}`}>
                        <i className="fa-solid fa-headset text-sm"></i>
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{t('help_desk')}</p>
                        <p className="text-[10px] font-medium opacity-70 truncate">{t('contact_support_desc')}</p>
                     </div>
                  </button>

                  {IsSuperAdmin && activeTab === 'support' && (
                     <div className="mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-3">{t('active_tickets')}</p>
                        <div className="space-y-1">
                           {supportChats.length > 0 ? (
                              supportChats.map(chat => (
                                 <button
                                    key={chat._id || chat.id}
                                    onClick={() => selectChat(chat)}
                                    className={`w-full text-left p-3 rounded-xl transition-all text-xs font-bold flex items-center border ${selectedChat?._id === chat._id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800'}`}
                                 >
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-3 animate-pulse"></span>
                                    <span className="truncate">{chat.name.replace('Support - ', '')}</span>
                                 </button>
                              ))
                           ) : (
                              <div className="text-center py-4 text-gray-400 text-xs font-medium italic">{t('no_active_tickets')}</div>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-sm relative">
            {showRestrictedAccess ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <div className="w-24 h-24 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-6">
                     <i className="fa-solid fa-lock text-3xl text-red-500"></i>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('restricted_access')}</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm">{t('support_restricted_desc')}</p>
               </div>
            ) : (
               <>
                  {/* Chat Header */}
                  <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-10 sticky top-0">
                     <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                           <i className={`fa-solid ${activeTab === 'global' ? 'fa-globe' : activeTab === 'team' ? 'fa-users' : 'fa-headset'}`}></i>
                        </div>
                        <div>
                           <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                              {selectedChat?.name || (activeTab === 'global' ? t('company_global') : activeTab === 'team' ? t('department_team') : t('help_desk'))}
                           </h3>
                           <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                 {Array.from(userMap.values()).length} {t('active_members')}
                              </p>
                           </div>
                        </div>
                     </div>

                     {IsCompanyAdmin && (
                        <button
                           onClick={handleClearChat}
                           className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all"
                           title="Clear history"
                        >
                           <i className="fa-solid fa-trash-can"></i>
                        </button>
                     )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-dots-pattern">
                     {messages.length > 0 ? (
                        messages.map((msg, idx) => {
                           const isMe = msg.sender?._id === userData?._id;
                           const senderInfo = getUserInfo(msg.sender);
                           const roleLabel = formatRole(senderInfo.role);

                           return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-3`}>
                                 {!isMe && (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                       {senderInfo.name?.charAt(0) || '?'}
                                    </div>
                                 )}

                                 <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && (
                                       <div className="flex items-center gap-2 mb-1 ml-1">
                                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{senderInfo.name}</span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${senderInfo.role === 'super_admin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                             {roleLabel}
                                          </span>
                                       </div>
                                    )}

                                    <div className={`relative px-5 py-3 rounded-2xl text-sm font-medium shadow-sm border transition-all ${isMe
                                       ? 'bg-blue-600 text-white border-blue-600 rounded-br-none'
                                       : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-100 dark:border-zinc-700 rounded-bl-none'
                                       }`}>
                                       {editingMessageId === msg._id ? (
                                          <div className="flex flex-col gap-2 min-w-[200px]">
                                             <input
                                                value={editInput}
                                                onChange={e => setEditInput(e.target.value)}
                                                className="bg-black/10 dark:bg-black/30 rounded-lg px-3 py-2 text-sm focus:outline-none w-full"
                                                autoFocus
                                             />
                                             <div className="flex justify-end gap-2 text-[10px] font-bold uppercase">
                                                <button onClick={() => setEditingMessageId(null)} className="opacity-70 hover:opacity-100">Cancel</button>
                                                <button onClick={() => handleEditSave(msg._id)} className="opacity-100 hover:underline">Save</button>
                                             </div>
                                          </div>
                                       ) : (
                                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                       )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                       <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-wider">
                                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                       </span>
                                       {isMe && !editingMessageId && (
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                             <button onClick={() => { setEditingMessageId(msg._id); setEditInput(msg.text); }} className="text-gray-400 hover:text-blue-500"><i className="fa-solid fa-pen text-[10px]"></i></button>
                                             <button onClick={() => handleDelete(msg._id)} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-trash text-[10px]"></i></button>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 opacity-50">
                           <i className="fa-regular fa-comments text-4xl mb-2"></i>
                           <p className="text-xs font-bold uppercase tracking-widest">{t('no_messages_yet')}</p>
                        </div>
                     )}
                     <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                     <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl p-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50">
                        <button
                           type="button"
                           onClick={() => fileInputRef.current?.click()}
                           className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                        >
                           <i className="fa-solid fa-paperclip"></i>
                        </button>
                        <input
                           type="file"
                           ref={fileInputRef}
                           style={{ display: 'none' }}
                           onChange={handleFileUpload}
                        />

                        <div className="flex-1 relative">
                           <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              placeholder={t('type_message_placeholder')}
                              className="w-full bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-medium placeholder-gray-400"
                           />
                        </div>

                        <button
                           type="button"
                           onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                           className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${showEmojiPicker ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-800'}`}
                        >
                           <i className="fa-regular fa-face-smile"></i>
                        </button>

                        {showEmojiPicker && (
                           <div className="absolute bottom-20 right-20 p-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-wrap gap-2 w-64 z-50">
                              {['😀', '😂', '😍', '👍', '🔥', '🚀', '💯', '✨', '✔️', '❌', '📁', '📄', '💻', '🤝', '🎉'].map(emoji => (
                                 <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                    className="text-xl hover:scale-125 transition transform p-1"
                                 >
                                    {emoji}
                                 </button>
                              ))}
                           </div>
                        )}

                        <button
                           type="submit"
                           disabled={!messageInput.trim()}
                           className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
                        >
                           <i className="fa-solid fa-paper-plane text-sm"></i>
                        </button>
                     </form>
                  </div>
               </>
            )}
         </div>
      </div>
   );
};

export default Chat;
