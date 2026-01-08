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
      if (userData?.company) {
         const companyId = userData.company._id || userData.company;
         getUsersByCompany(companyId);
      }
   }, [userData?.company, getUsersByCompany]);

   useEffect(() => {
      const initChat = async () => {
         if (Array.isArray(chats) && !isLoading && userData?._id) {
            let targetChat = null;
            const companyId = userData.company?._id || userData.company || null;
            const createPayload = { participants: [userData._id] };
            if (companyId && typeof companyId === 'string') createPayload.company = companyId;

            const attemptKey = `${activeTab}-${companyId || 'no-comp'}`;

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
               targetChat = chats.find(c => (c.type === 'team' && c.name === 'Department Team'));
               if (!targetChat && (userData?.role === 'team_lead' || IsCompanyAdmin) && companyId && !attemptRef.current.has(attemptKey)) {
                  attemptRef.current.add(attemptKey);
                  const ids = await getParticipants();
                  createChat({ ...createPayload, type: 'team', name: 'Department Team', participants: ids })
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
                     const ids = await getParticipants();
                     createChat({ ...createPayload, type: 'team', name: supportName, participants: ids })
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
         toast.error("No chat selected.");
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

      // Since the current API might not support file uploads, we mock it or use text for now
      // Typically we would use a formData upload here
      toast.info(`Uploading: ${file.name}`);
      // await sendMessage(selectedChat._id, { text: `[File: ${file.name}]`, file });
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
      <div className="flex h-[calc(100vh-80px)] overflow-hidden p-6 gap-6 bg-gray-50 dark:bg-dark-primary">
         {/* Sidebar */}
         <div className="w-1/4 bg-white dark:bg-dark-secondary/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800/50 rounded-3xl flex flex-col shadow-xl dark:shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800/50 bg-gray-50 dark:bg-gradient-to-br dark:from-dark-secondary dark:to-dark-tertiary/20">
               <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{t('messages_sidebar_title')}</h2>
               <p className="text-xs text-gray-500 dark:text-gray-400 font-medium opacity-60 uppercase tracking-widest">{t('team_collaboration_desc')}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {!IsSuperAdmin && (
                  <>
                     <button
                        onClick={() => setActiveTab('global')}
                        className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 group border ${activeTab === 'global' ? 'bg-red-50 dark:bg-dark-accent/10 border-red-200 dark:border-dark-accent/30 text-red-700 dark:text-white shadow-lg shadow-red-900/10' : 'border-transparent hover:bg-gray-100 dark:hover:bg-dark-tertiary/40 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                     >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${activeTab === 'global' ? 'bg-red-500 dark:bg-dark-accent shadow-lg shadow-red-900/40 text-white dark:text-black' : 'bg-gray-200 dark:bg-dark-tertiary group-hover:bg-red-100 dark:group-hover:bg-dark-accent/20 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-dark-accent'}`}>
                           <i className="fa-solid fa-globe text-lg"></i>
                        </div>
                        <div className="flex-1">
                           <p className="font-bold text-sm tracking-tight">{t('company_global')}</p>
                           <p className={`text-[10px] font-medium uppercase tracking-wider ${activeTab === 'global' ? 'text-red-500 dark:text-dark-accent/80' : 'text-gray-400 dark:text-gray-500'}`}>{t('public_channel_desc')}</p>
                        </div>
                     </button>

                     <button
                        onClick={() => setActiveTab('team')}
                        className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 group border ${activeTab === 'team' ? 'bg-red-50 dark:bg-dark-accent/10 border-red-200 dark:border-dark-accent/30 text-red-700 dark:text-white shadow-lg shadow-red-900/10' : 'border-transparent hover:bg-gray-100 dark:hover:bg-dark-tertiary/40 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                     >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${activeTab === 'team' ? 'bg-red-500 dark:bg-dark-accent shadow-lg shadow-red-900/40 text-white dark:text-black' : 'bg-gray-200 dark:bg-dark-tertiary group-hover:bg-red-100 dark:group-hover:bg-dark-accent/20 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-dark-accent'}`}>
                           <i className="fa-solid fa-users text-lg"></i>
                        </div>
                        <div className="flex-1">
                           <p className="font-bold text-sm tracking-tight">{t('department_team')}</p>
                           <p className={`text-[10px] font-medium uppercase tracking-wider ${activeTab === 'team' ? 'text-red-500 dark:text-dark-accent/80' : 'text-gray-400 dark:text-gray-500'}`}>{t('private_updates_desc')}</p>
                        </div>
                     </button>
                  </>
               )}

               <button
                  onClick={() => setActiveTab('support')}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 group border ${activeTab === 'support' ? 'bg-red-50 dark:bg-dark-accent/10 border-red-200 dark:border-dark-accent/30 text-red-700 dark:text-white shadow-lg shadow-red-900/10' : 'border-transparent hover:bg-gray-100 dark:hover:bg-dark-tertiary/40 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
               >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${activeTab === 'support' ? 'bg-red-500 dark:bg-dark-accent shadow-lg shadow-red-900/40 text-white dark:text-black' : 'bg-gray-200 dark:bg-dark-tertiary group-hover:bg-red-100 dark:group-hover:bg-dark-accent/20 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-dark-accent'}`}>
                     <i className="fa-solid fa-headset text-lg"></i>
                  </div>
                  <div className="flex-1">
                     <p className="font-bold text-sm tracking-tight">{t('help_desk')}</p>
                     <p className={`text-[10px] font-medium uppercase tracking-wider ${activeTab === 'support' ? 'text-red-500 dark:text-dark-accent/80' : 'text-gray-400 dark:text-gray-500'}`}>{t('contact_support_desc')}</p>
                  </div>
               </button>

               {IsSuperAdmin && activeTab === 'support' && (
                  <div className="mt-8 border-t border-gray-200 dark:border-gray-800/50 pt-6 px-2">
                     <p className="text-[10px] font-bold text-gray-500 uppercase px-2 mb-4 tracking-widest">{t('active_tickets')}</p>
                     {supportChats.length > 0 ? (
                        supportChats.map(chat => (
                           <button
                              key={chat._id || chat.id}
                              onClick={() => selectChat(chat)}
                              className={`w-full text-left p-3.5 rounded-xl transition-all duration-300 text-xs mb-2 flex items-center border ${selectedChat?._id === chat._id ? 'bg-red-50 dark:bg-dark-accent/10 text-red-600 dark:text-dark-accent border-red-200 dark:border-dark-accent/30 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-tertiary/50 border-transparent'}`}
                           >
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-dark-accent mr-3 animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.5)]"></span>
                              <span className="truncate font-bold tracking-tight">{chat.name.replace('Support - ', '')}</span>
                           </button>
                        ))
                     ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-600 text-xs italic font-medium">{t('no_active_tickets')}</div>
                     )}
                  </div>
               )}
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-1 bg-white dark:bg-dark-secondary/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800/50 rounded-3xl flex flex-col relative overflow-hidden shadow-xl dark:shadow-2xl animate-fadeIn">

            {showRestrictedAccess ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50 dark:bg-dark-secondary/20">
                  <div className="w-24 h-24 bg-red-50 dark:bg-dark-accent/10 border border-red-100 dark:border-dark-accent/20 rounded-3xl flex items-center justify-center mb-10 transition-transform duration-500 shadow-2xl">
                     <i className="fa-solid fa-user-shield text-4xl text-red-500 dark:text-dark-accent shadow-xl"></i>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">{t('restricted_access')}</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-10 leading-relaxed font-medium">
                     {t('support_restricted_desc')}
                  </p>
                  <div className="flex items-center space-x-3 text-red-600 dark:text-dark-accent text-xs font-bold bg-red-50 dark:bg-dark-accent/10 px-6 py-3 rounded-2xl border border-red-100 dark:border-dark-accent/20 uppercase tracking-widest">
                     <i className="fa-solid fa-circle-info"></i>
                     <span>{t('policy_applied_for')} {formatRole(userData.role)}</span>
                  </div>
               </div>
            ) : (
               <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800/50 flex justify-between items-center bg-white/80 dark:bg-dark-tertiary/20 backdrop-blur-3xl">
                     <div className="flex items-center space-x-5">
                        <div className="relative">
                           <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl dark:shadow-2xl bg-gradient-to-br from-red-500 to-red-700 dark:from-dark-accent dark:to-red-800">
                              <i className={`fa-solid ${activeTab === 'global' ? 'fa-globe' :
                                 activeTab === 'team' ? 'fa-users' : 'fa-headset'
                                 } text-white dark:text-black text-2xl`}></i>
                           </div>
                           <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-dark-secondary rounded-full shadow-lg"></span>
                        </div>
                        <div>
                           <h3 className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">
                              {selectedChat?.name || (activeTab === 'global' ? t('company_global') :
                                 activeTab === 'team' ? t('department_team') : t('help_desk'))}
                           </h3>
                           <div className="flex items-center space-x-2 mt-0.5">
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                                 {Array.from(userMap.values()).length} {t('active_members')}
                              </p>
                           </div>
                        </div>
                     </div>

                     {IsCompanyAdmin && (
                        <button
                           onClick={handleClearChat}
                           className="text-gray-400 hover:text-red-600 dark:hover:text-dark-accent transition-all duration-300 text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2 px-4 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-dark-accent/10 border border-transparent hover:border-red-100 dark:hover:border-dark-accent/20"
                           title="Clear entire chat history"
                        >
                           <i className="fa-solid fa-trash-can"></i>
                           <span>{t('clear_history')}</span>
                        </button>
                     )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth custom-scrollbar bg-gray-50/50 dark:bg-transparent" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(100, 100, 100, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                     {messages.length > 0 ? (
                        messages.map((msg, idx) => {
                           const isMe = msg.sender?._id === userData?._id;
                           const senderInfo = getUserInfo(msg.sender);
                           const roleLabel = formatRole(senderInfo.role);

                           return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-fadeIn`}>
                                 {!isMe && (
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-dark-tertiary dark:to-gray-800 flex items-center justify-center mr-4 mt-1 shadow-lg border border-gray-200 dark:border-gray-700/50 text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">
                                       {senderInfo.name?.charAt(0) || '?'}
                                    </div>
                                 )}

                                 <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && (
                                       <div className="flex items-center space-x-2 mb-2 ml-1">
                                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-tight">{senderInfo.name || 'Unknown'}</span>
                                          <span className={`text-[9px] px-2 py-0.5 rounded-lg border font-bold uppercase tracking-wider ${senderInfo.role === 'super_admin' ? 'bg-red-50 dark:bg-dark-accent/10 text-red-600 dark:text-dark-accent border-red-200 dark:border-dark-accent/20' :
                                             senderInfo.role === 'company_admin' ? 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600/50' :
                                                'bg-gray-200 dark:bg-gray-800/30 text-gray-600 dark:text-gray-500 border-gray-300 dark:border-gray-700/30'
                                             }`}>
                                             {roleLabel}
                                          </span>
                                       </div>
                                    )}

                                    <div className={`relative px-6 py-4 rounded-3xl text-sm shadow-md dark:shadow-xl border transition-all duration-300 ${isMe
                                       ? 'bg-red-600 dark:bg-dark-accent text-white dark:text-black rounded-tr-none border-red-600 dark:border-dark-accent shadow-red-900/10'
                                       : 'bg-white dark:bg-dark-tertiary/40 backdrop-blur-md text-gray-800 dark:text-gray-200 rounded-tl-none border-gray-200 dark:border-gray-700/30'
                                       }`}>
                                       {editingMessageId === msg._id ? (
                                          <div className="flex flex-col space-y-3 min-w-[280px]">
                                             <input
                                                value={editInput}
                                                onChange={e => setEditInput(e.target.value)}
                                                className={`bg-black/10 dark:bg-black/30 border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all ${isMe ? 'border-white/20 text-white dark:text-black' : 'border-gray-300 dark:border-white/20 text-gray-800 dark:text-white'}`}
                                                autoFocus
                                             />
                                             <div className="flex justify-end space-x-4 text-xs font-bold uppercase tracking-widest pt-1">
                                                <button onClick={() => setEditingMessageId(null)} className={`${isMe ? 'text-white/80 hover:text-white dark:text-black/60 dark:hover:text-black' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'} transition`}>Cancel</button>
                                                <button onClick={() => handleEditSave(msg._id)} className={`${isMe ? 'text-white dark:text-black' : 'text-red-600 dark:text-dark-accent'} transition`}>Save</button>
                                             </div>
                                          </div>
                                       ) : (
                                          <>
                                             <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>
                                             {msg.isEdited && <div className="flex justify-end mt-2"><i className="fa-solid fa-pen text-[9px] opacity-40" title="Edited"></i></div>}
                                          </>
                                       )}

                                       {isMe && !editingMessageId && (
                                          <div className="absolute top-0 right-full mr-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center space-x-2 pt-1 translate-x-4 group-hover:translate-x-0">
                                             <button onClick={() => { setEditingMessageId(msg._id); setEditInput(msg.text); }} className="w-8 h-8 rounded-xl bg-white dark:bg-dark-tertiary/80 backdrop-blur-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-xs shadow-lg dark:shadow-2xl transition"><i className="fa-solid fa-pen"></i></button>
                                             <button onClick={() => handleDelete(msg._id)} className="w-8 h-8 rounded-xl bg-white dark:bg-dark-tertiary/80 backdrop-blur-md text-gray-400 hover:text-red-600 dark:hover:text-dark-accent hover:bg-red-50 dark:hover:bg-dark-accent/10 flex items-center justify-center text-xs shadow-lg dark:shadow-2xl transition"><i className="fa-solid fa-trash"></i></button>
                                          </div>
                                       )}
                                    </div>
                                    <span className="text-[9px] text-gray-400 dark:text-gray-600 mt-2 mx-2 font-bold uppercase tracking-tighter opacity-70 dark:opacity-60">
                                       {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                           <div className="w-24 h-24 bg-gray-100 dark:bg-dark-tertiary/20 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-200 dark:border-gray-800/30">
                              <i className="fa-regular fa-comments text-5xl opacity-20"></i>
                           </div>
                           <p className="text-sm font-bold uppercase tracking-widest opacity-40">{t('no_messages_yet')}</p>
                           <p className="text-[10px] font-medium uppercase tracking-tighter opacity-30 mt-1">{t('start_conversation_desc')}</p>
                        </div>
                     )}
                     <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-6 bg-white/90 dark:bg-dark-tertiary/30 backdrop-blur-3xl border-t border-gray-200 dark:border-gray-800/50">
                     <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                        <input
                           type="file"
                           ref={fileInputRef}
                           style={{ display: 'none' }}
                           accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                           onChange={handleFileUpload}
                        />
                        <button
                           type="button"
                           onClick={() => fileInputRef.current?.click()}
                           className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all duration-300 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                        >
                           <i className="fa-solid fa-paperclip text-lg"></i>
                        </button>
                        <div className="flex-1 relative group">
                           <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              placeholder={t('type_message_placeholder')}
                              className="w-full bg-gray-100 dark:bg-dark-secondary/60 border border-gray-200 dark:border-gray-700/50 rounded-2xl pl-6 pr-14 py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 font-medium focus:outline-none focus:border-red-500 dark:focus:border-dark-accent/50 focus:ring-4 focus:ring-red-500/10 dark:focus:ring-dark-accent/5 transition-all duration-300 shadow-inner"
                           />
                           <button
                              type="button"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className={`absolute right-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${showEmojiPicker ? 'text-red-500 dark:text-dark-accent' : 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-dark-accent'}`}
                           >
                              <i className="fa-regular fa-face-smile text-xl"></i>
                           </button>

                           {showEmojiPicker && (
                              <div className="absolute bottom-full right-0 mb-4 p-4 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl dark:shadow-2xl animate-fadeIn flex flex-wrap gap-2 w-64 z-50">
                                 {['😀', '😂', '😍', '👍', '🔥', '🚀', '💯', '✨', '✔️', '❌', '📁', '📄', '💻', '🤝', '🎉'].map(emoji => (
                                    <button
                                       key={emoji}
                                       type="button"
                                       onClick={() => insertEmoji(emoji)}
                                       className="text-2xl hover:scale-125 transition transform"
                                    >
                                       {emoji}
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>
                        <button
                           type="submit"
                           disabled={!messageInput.trim()}
                           className="bg-red-600 dark:bg-dark-accent border border-red-700 dark:border-dark-accent/20 hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-black w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl dark:shadow-2xl shadow-red-900/20 dark:shadow-red-900/40 group active:scale-90"
                        >
                           <i className="fa-solid fa-paper-plane text-xl group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>
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
