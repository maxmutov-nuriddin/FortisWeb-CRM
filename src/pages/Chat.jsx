import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useChatStore } from '../store/chat.store';
import { useAuthStore } from '../store/auth.store';
import { useUserStore } from '../store/user.store';
import PageLoader from '../components/loader/PageLoader';
import { toast } from 'react-toastify';

const Chat = () => {
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
      markChatRead
   } = useChatStore();

   const { users, getUsersByCompany } = useUserStore();

   const [messageInput, setMessageInput] = useState('');
   const [activeTab, setActiveTab] = useState('global'); // global, team, support
   const [editingMessageId, setEditingMessageId] = useState(null);
   const [editInput, setEditInput] = useState('');
   const messagesEndRef = useRef(null);

   const userData = user?.data?.user || user;
   const IsSuperAdmin = userData?.role === 'super_admin';
   const IsCompanyAdmin = userData?.role === 'company_admin';
   const isAdmin = IsSuperAdmin || IsCompanyAdmin;

   // DATA OPTIMIZATION: Memoize user map for O(1) lookup
   const userMap = useMemo(() => {
      const allUsers = users?.data?.users || (Array.isArray(users) ? users : []);
      const map = new Map();
      allUsers.forEach(u => {
         if (u._id) map.set(u._id, u);
         if (u.id) map.set(u.id, u);
      });
      // Ensure current user is in map
      if (userData?._id) map.set(userData._id, userData);
      return map;
   }, [users, userData]);

   useEffect(() => {
      getAllChats();
   }, [getAllChats]);

   const attemptRef = useRef(new Set());

   // Ensure users are loaded for role lookup
   useEffect(() => {
      if (userData?.company) {
         const companyId = userData.company._id || userData.company;
         // Only fetch if we don't have users yet or logic requires it
         // Since userMap depends on 'users', this triggers the update
         getUsersByCompany(companyId);
      }
   }, [userData?.company, getUsersByCompany]);

   // Auto-select or Auto-create chat based on tab
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
               // If users already loaded in store, use them to avoid fetch spam
               if (userMap.size > 1) { // >1 assuming at least self is there
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
               // SUPPORT RESTRICTION: Only SuperAdmin (list) or CompanyAdmin (create)
               if (IsSuperAdmin) return; // Handled by list view

               if (IsCompanyAdmin) {
                  const supportName = `Support - ${userData.name}`; // e.g., "Support - Acme Inc Admin"
                  targetChat = chats.find(c => c.name === supportName);
                  if (!targetChat && !attemptRef.current.has(attemptKey)) {
                     attemptRef.current.add(attemptKey);
                     const ids = await getParticipants();
                     createChat({ ...createPayload, type: 'team', name: supportName, participants: ids })
                        .then((newChat) => selectChat(newChat)).catch(err => console.error("Support init failed", err));
                     return;
                  }
               } else {
                  // Regular users do NOTHING here. Render logic handles restriction message.
                  selectChat(null); // Deselect any chat to show the restriction screen
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

   // Helper to find user info from store optimized
   const getUserInfo = (sender) => {
      const senderId = sender?._id || sender;
      // Try map first (source of truth for latest role)
      if (userMap.has(senderId)) return userMap.get(senderId);
      // Fallback to message data
      if (sender?.role) return sender;
      return { name: 'Unknown', role: 'user' };
   };

   // Helper formatting function
   const formatRole = (role) => {
      if (!role) return 'Employee';
      if (role === 'user') return 'Employee';
      if (role === 'company_admin') return 'Company Admin';
      if (role === 'super_admin') return 'Support Agent';
      if (role === 'team_lead') return 'Team Lead';
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
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); // changed to auto for snappiness, smooth can be laggy with polling
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
      } catch (error) {
         console.error(error);
         toast.error(error.response?.data?.message || 'Failed to send message');
      }
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

   const handleClearChat = async () => {
      if (window.confirm('Delete chat history?')) {
         try {
            await clearChat(selectedChat._id);
            toast.success('Cleared');
            getChatMessages(selectedChat._id);
         } catch (error) {
            toast.error(error.response?.data?.message || 'Failed');
         }
      }
   };

   if (isLoading && !selectedChat && !IsSuperAdmin) return <PageLoader />;

   const supportChats = IsSuperAdmin ? chats.filter(c => c.name.startsWith('Support - ')) : [];

   // RESTRICTION RENDER LOGIC
   const showRestrictedAccess = activeTab === 'support' && !IsSuperAdmin && !IsCompanyAdmin;

   return (
      <div className="flex h-[calc(100vh-80px)] overflow-hidden p-6 gap-6">
         {/* Sidebar */}
         <div className="w-1/4 bg-dark-secondary border border-gray-800 rounded-xl flex flex-col shadow-xl">
            <div className="p-5 border-b border-gray-800 bg-gradient-to-r from-dark-secondary to-dark-tertiary rounded-t-xl">
               <h2 className="text-xl font-bold text-white mb-1">Messages</h2>
               <p className="text-xs text-gray-400">Team Collaboration</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
               <button
                  onClick={() => setActiveTab('global')}
                  className={`w-full text-left p-4 rounded-xl transition flex items-center space-x-3 group ${activeTab === 'global' ? 'bg-indigo-600 shadow-lg shadow-indigo-900/40 text-white' : 'hover:bg-dark-tertiary text-gray-400'}`}
               >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeTab === 'global' ? 'bg-white/20' : 'bg-dark-tertiary group-hover:bg-dark-primary'}`}>
                     <i className="fa-solid fa-globe text-lg"></i>
                  </div>
                  <div>
                     <p className="font-bold text-sm">Company Global</p>
                     <p className={`text-xs ${activeTab === 'global' ? 'text-indigo-200' : 'text-gray-500'}`}>General discussion</p>
                  </div>
               </button>

               <button
                  onClick={() => setActiveTab('team')}
                  className={`w-full text-left p-4 rounded-xl transition flex items-center space-x-3 group ${activeTab === 'team' ? 'bg-purple-600 shadow-lg shadow-purple-900/40 text-white' : 'hover:bg-dark-tertiary text-gray-400'}`}
               >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeTab === 'team' ? 'bg-white/20' : 'bg-dark-tertiary group-hover:bg-dark-primary'}`}>
                     <i className="fa-solid fa-users text-lg"></i>
                  </div>
                  <div>
                     <p className="font-bold text-sm">Department Team</p>
                     <p className={`text-xs ${activeTab === 'team' ? 'text-purple-200' : 'text-gray-500'}`}>Work updates</p>
                  </div>
               </button>

               <button
                  onClick={() => setActiveTab('support')}
                  className={`w-full text-left p-4 rounded-xl transition flex items-center space-x-3 group ${activeTab === 'support' ? 'bg-green-600 shadow-lg shadow-green-900/40 text-white' : 'hover:bg-dark-tertiary text-gray-400'}`}
               >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeTab === 'support' ? 'bg-white/20' : 'bg-dark-tertiary group-hover:bg-dark-primary'}`}>
                     <i className="fa-solid fa-headset text-lg"></i>
                  </div>
                  <div>
                     <p className="font-bold text-sm">Help Desk</p>
                     <p className={`text-xs ${activeTab === 'support' ? 'text-green-200' : 'text-gray-500'}`}>Contact Support</p>
                  </div>
               </button>

               {IsSuperAdmin && activeTab === 'support' && (
                  <div className="mt-4 border-t border-gray-800 pt-4 px-2">
                     <p className="text-xs font-bold text-gray-500 uppercase px-2 mb-2 tracking-wider">Active Tickets</p>
                     {supportChats.length > 0 ? (
                        supportChats.map(chat => (
                           <button
                              key={chat._id || chat.id}
                              onClick={() => selectChat(chat)}
                              className={`w-full text-left p-3 rounded-lg transition text-xs mb-1 flex items-center ${selectedChat?._id === chat._id ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:text-white hover:bg-dark-tertiary'}`}
                           >
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                              <span className="truncate">{chat.name.replace('Support - ', '')}</span>
                           </button>
                        ))
                     ) : (
                        <div className="text-center py-4 text-gray-600 text-xs italic">No active tickets</div>
                     )}
                  </div>
               )}
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-1 bg-dark-secondary border border-gray-800 rounded-xl flex flex-col relative overflow-hidden shadow-xl">

            {showRestrictedAccess ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-dark-secondary">
                  <div className="w-24 h-24 bg-dark-tertiary rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                     <i className="fa-solid fa-user-shield text-4xl text-gray-500"></i>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Restricted Access</h3>
                  <p className="text-gray-400 max-w-md mb-6 leading-relaxed">
                     Direct support channel is available for Company Admins only. <br />
                     Please contact your <strong>Company Administrator</strong> to raise a support ticket on your behalf.
                  </p>
                  <div className="flex items-center space-x-2 text-indigo-400 text-sm bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
                     <i className="fa-solid fa-circle-info"></i>
                     <span>Policy applied for {formatRole(userData.role)}</span>
                  </div>
               </div>
            ) : (
               <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-dark-tertiary/50 backdrop-blur-sm">
                     <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${activeTab === 'global' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' :
                           activeTab === 'team' ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-green-500 to-green-700'
                           }`}>
                           <i className={`fa-solid ${activeTab === 'global' ? 'fa-globe' :
                              activeTab === 'team' ? 'fa-users' : 'fa-headset'
                              } text-white text-xl`}></i>
                        </div>
                        <div>
                           <h3 className="text-white font-bold text-lg">
                              {selectedChat?.name || (activeTab === 'global' ? 'Company Global' :
                                 activeTab === 'team' ? 'Department Team' : 'Help Desk')}
                           </h3>
                           <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                              <p className="text-xs text-green-400 font-medium tracking-wide">
                                 {Array.from(userMap.values()).length} Online Members
                              </p>
                           </div>
                        </div>
                     </div>

                     {IsCompanyAdmin && (
                        <button
                           onClick={handleClearChat}
                           className="text-gray-400 hover:text-red-400 transition text-xs flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                           title="Clear entire chat history"
                        >
                           <i className="fa-solid fa-trash-can"></i>
                           <span className="font-medium">Clear History</span>
                        </button>
                     )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar" style={{ backgroundImage: 'radial-gradient(circle at center, #374151 1px, transparent 1px)', backgroundSize: '32px 32px', backgroundColor: '#111827' }}>
                     {messages.length > 0 ? (
                        messages.map((msg, idx) => {
                           const isMe = msg.sender?._id === userData?._id;
                           const senderInfo = getUserInfo(msg.sender);
                           const roleLabel = formatRole(senderInfo.role);

                           return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-fade-in`}>
                                 {!isMe && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mr-3 mt-1 shadow-md border border-gray-700 text-xs font-bold text-gray-300">
                                       {senderInfo.name?.charAt(0) || '?'}
                                    </div>
                                 )}

                                 <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && (
                                       <div className="flex items-baseline space-x-2 mb-1">
                                          <span className="text-xs font-bold text-gray-300">{senderInfo.name || 'Unknown'}</span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${senderInfo.role === 'super_admin' ? 'bg-red-900/30 text-red-400 border-red-500/30' :
                                             senderInfo.role === 'company_admin' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30' :
                                                'bg-gray-800 text-gray-400 border-gray-700'
                                             }`}>
                                             {roleLabel}
                                          </span>
                                       </div>
                                    )}

                                    <div className={`relative px-5 py-3.5 rounded-2xl text-sm shadow-md transition-shadow hover:shadow-lg ${isMe
                                       ? 'bg-indigo-600 text-white rounded-br-none'
                                       : 'bg-dark-tertiary text-gray-200 rounded-bl-none border border-gray-700/50'
                                       }`}>
                                       {editingMessageId === msg._id ? (
                                          <div className="flex flex-col space-y-2 min-w-[240px]">
                                             <input
                                                value={editInput}
                                                onChange={e => setEditInput(e.target.value)}
                                                className="bg-black/30 border border-white/20 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-white/40"
                                                autoFocus
                                             />
                                             <div className="flex justify-end space-x-3 text-xs pt-1">
                                                <button onClick={() => setEditingMessageId(null)} className="text-white/60 hover:text-white transition">Cancel</button>
                                                <button onClick={() => handleEditSave(msg._id)} className="font-bold text-white hover:text-indigo-200 transition">Save</button>
                                             </div>
                                          </div>
                                       ) : (
                                          <>
                                             <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                             {msg.isEdited && <div className="flex justify-end mt-1"><i className="fa-solid fa-pen text-[9px] opacity-40" title="Edited"></i></div>}
                                          </>
                                       )}

                                       {isMe && !editingMessageId && (
                                          <div className="absolute top-0 right-full mr-2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center space-x-1 pt-2 translate-x-2 group-hover:translate-x-0">
                                             <button onClick={() => { setEditingMessageId(msg._id); setEditInput(msg.text); }} className="w-7 h-7 rounded-full bg-dark-tertiary text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center text-xs shadow-lg transition"><i className="fa-solid fa-pen"></i></button>
                                             <button onClick={() => handleDelete(msg._id)} className="w-7 h-7 rounded-full bg-dark-tertiary text-gray-400 hover:text-red-400 hover:bg-red-900/20 flex items-center justify-center text-xs shadow-lg transition"><i className="fa-solid fa-trash"></i></button>
                                          </div>
                                       )}
                                    </div>
                                    <span className="text-[10px] text-gray-600 mt-1 mx-1 font-medium select-none">
                                       {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
                           <div className="w-20 h-20 bg-dark-tertiary rounded-full flex items-center justify-center mb-4">
                              <i className="fa-regular fa-comments text-4xl"></i>
                           </div>
                           <p className="text-sm font-medium">No messages yet</p>
                           <p className="text-xs">Start the conversation!</p>
                        </div>
                     )}
                     <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-dark-tertiary border-t border-gray-800">
                     <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                        <button type="button" className="text-gray-500 hover:text-gray-300 transition p-2 rounded-full hover:bg-gray-700/50">
                           <i className="fa-solid fa-paperclip text-lg"></i>
                        </button>
                        <div className="flex-1 relative group">
                           <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              placeholder="Type your message..."
                              className="w-full bg-dark-secondary border border-gray-700 rounded-xl pl-5 pr-12 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition shadow-inner"
                           />
                           <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-yellow-400 transition"
                           >
                              <i className="fa-regular fa-face-smile text-lg"></i>
                           </button>
                        </div>
                        <button
                           type="submit"
                           disabled={!messageInput.trim()}
                           className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-700 disabled:to-gray-700 text-white w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 shadow-lg shadow-indigo-900/30 group active:scale-95"
                        >
                           <i className="fa-solid fa-paper-plane text-lg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
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
