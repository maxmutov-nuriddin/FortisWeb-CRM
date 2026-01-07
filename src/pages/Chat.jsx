import React, { useEffect, useState, useRef } from 'react';
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

   const { getUsersByCompany } = useUserStore();

   const [messageInput, setMessageInput] = useState('');
   const [activeTab, setActiveTab] = useState('global'); // global, team, support
   const [editingMessageId, setEditingMessageId] = useState(null);
   const [editInput, setEditInput] = useState('');
   const messagesEndRef = useRef(null);

   const userData = user?.data?.user || user;
   const IsSuperAdmin = userData?.role === 'super_admin';
   const isAdmin = userData?.role === 'super_admin' || userData?.role === 'company_admin';

   useEffect(() => {
      getAllChats();
   }, [getAllChats]);

   const attemptRef = useRef(new Set());

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
               try {
                  const res = await getUsersByCompany(companyId);
                  const allUsers = res?.data?.users || [];
                  const ids = allUsers.map(u => u._id).filter(id => id);
                  if (!ids.includes(userData._id)) ids.push(userData._id);
                  return { ids, allUsers }; // return full objects too to find admin
               } catch (err) {
                  console.error("Failed to fetch participants", err);
                  return { ids: [userData._id], allUsers: [] };
               }
            };

            if (activeTab === 'global') {
               targetChat = chats.find(c => (c.type === 'team' && c.name === 'Company Global'));

               if (!targetChat && !isLoading && companyId && !attemptRef.current.has(attemptKey)) {
                  attemptRef.current.add(attemptKey);
                  const { ids } = await getParticipants();
                  createChat({
                     ...createPayload,
                     type: 'team',
                     name: 'Company Global',
                     participants: ids
                  }).then((newChat) => selectChat(newChat)).catch(err => console.error("Global init failed", err));
                  return;
               }
            } else if (activeTab === 'team') {
               targetChat = chats.find(c => (c.type === 'team' && c.name === 'Department Team'));

               if (!targetChat && (userData?.role === 'team_lead' || userData?.role === 'company_admin') && companyId && !attemptRef.current.has(attemptKey)) {
                  attemptRef.current.add(attemptKey);
                  const { ids } = await getParticipants();
                  createChat({
                     ...createPayload,
                     type: 'team',
                     name: 'Department Team',
                     participants: ids
                  }).then((newChat) => selectChat(newChat)).catch(err => console.error("Team init failed", err));
                  return;
               }
            } else if (activeTab === 'support') {
               // Support Logic
               if (IsSuperAdmin) {
                  // Super Admin does NOT auto-create, they see a list.
                  // We do nothing here, the sidebar render handles it.
                  return;
               } else {
                  // Regular User: Create "Support - [My Name]"
                  const supportName = `Support - ${userData.name}`;
                  targetChat = chats.find(c => c.name === supportName);

                  if (!targetChat && !attemptRef.current.has(attemptKey)) {
                     attemptRef.current.add(attemptKey);
                     const { ids, allUsers } = await getParticipants();

                     // Try to find super admin in company users, or just use all company users as fallback
                     // ideally support chat is private between User and Super Admin.
                     // Since we don't have super admin ID easily if they aren't in company, 
                     // we'll rely on the fact that Super Admin fetches ALL chats.
                     // We will create a chat with type 'team' (backend constraint) but name it specifically.
                     // and add all company admins + user.

                     createChat({
                        ...createPayload,
                        type: 'team',
                        name: supportName,
                        participants: ids // Adding all for now to ensure visibility, Super Admin can filter
                     }).then((newChat) => selectChat(newChat)).catch(err => console.error("Support init failed", err));
                     return;
                  }
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
   }, [activeTab, chats, isLoading, userData, getUsersByCompany, IsSuperAdmin]);

   // Helper formatting function
   const formatRole = (role) => {
      if (!role) return 'User';
      return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
   };

   // Check scroll
   useEffect(() => {
      scrollToBottom();
   }, [messages]);

   // Polling
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
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   };

   const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!messageInput.trim()) return;
      if (!selectedChat) {
         toast.error("No chat selected or available.");
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
   const handleEditCancel = () => {
      setEditingMessageId(null);
      setEditInput('');
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
         } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete message');
         }
      }
   };
   const handleClearChat = async () => {
      if (window.confirm('Are you sure you want to clear the entire chat history? This cannot be undone.')) {
         try {
            await clearChat(selectedChat._id);
            toast.success('Chat cleared');
            getChatMessages(selectedChat._id);
         } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to clear chat');
         }
      }
   };

   const isCompanyAdmin = userData?.role === 'company_admin';

   if (isLoading && !selectedChat && !IsSuperAdmin) return <PageLoader />;

   // For Super Admin in Support mode, filtering chats
   const supportChats = IsSuperAdmin ? chats.filter(c => c.name.startsWith('Support - ')) : [];

   return (
      <div className="flex h-[calc(100vh-80px)] overflow-hidden p-6 gap-6">
         {/* Sidebar */}
         <div className="w-1/4 bg-dark-secondary border border-gray-800 rounded-xl flex flex-col">
            <div className="p-4 border-b border-gray-800">
               <h2 className="text-xl font-bold text-white mb-1">Chat</h2>
               <p className="text-xs text-gray-400">Connect with your team</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
               <button
                  onClick={() => setActiveTab('global')}
                  className={`w-full text-left p-3 rounded-lg transition flex items-center space-x-3 ${activeTab === 'global' ? 'bg-indigo-600 bg-opacity-20 border border-indigo-500 text-white' : 'hover:bg-dark-tertiary text-gray-400'}`}
               >
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                     <i className="fa-solid fa-globe text-white"></i>
                  </div>
                  <div>
                     <p className="font-medium text-sm">Company Global</p>
                     <p className="text-xs opacity-70">Company-wide</p>
                  </div>
               </button>

               <button
                  onClick={() => setActiveTab('team')}
                  className={`w-full text-left p-3 rounded-lg transition flex items-center space-x-3 ${activeTab === 'team' ? 'bg-purple-600 bg-opacity-20 border border-purple-500 text-white' : 'hover:bg-dark-tertiary text-gray-400'}`}
               >
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                     <i className="fa-solid fa-users text-white"></i>
                  </div>
                  <div>
                     <p className="font-medium text-sm">Department Team</p>
                     <p className="text-xs opacity-70">Your department</p>
                  </div>
               </button>

               <button
                  onClick={() => setActiveTab('support')}
                  className={`w-full text-left p-3 rounded-lg transition flex items-center space-x-3 ${activeTab === 'support' ? 'bg-green-600 bg-opacity-20 border border-green-500 text-white' : 'hover:bg-dark-tertiary text-gray-400'}`}
               >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                     <i className="fa-solid fa-headset text-white"></i>
                  </div>
                  <div>
                     <p className="font-medium text-sm">Help Desk</p>
                     <p className="text-xs opacity-70">Support Tickets</p>
                  </div>
               </button>

               {/* Super Admin Support List */}
               {IsSuperAdmin && activeTab === 'support' && (
                  <div className="mt-4 border-t border-gray-800 pt-4">
                     <p className="text-xs font-bold text-gray-500 uppercase px-3 mb-2">Open Tickets</p>
                     {supportChats.length > 0 ? (
                        supportChats.map(chat => (
                           <button
                              key={chat._id || chat.id}
                              onClick={() => selectChat(chat)}
                              className={`w-full text-left p-2 rounded-lg transition text-xs mb-1 ${selectedChat?._id === chat._id ? 'bg-green-500 bg-opacity-20 text-white border border-green-500' : 'text-gray-400 hover:text-white hover:bg-dark-tertiary'}`}
                           >
                              <i className="fa-solid fa-ticket mr-2"></i>
                              {chat.name}
                           </button>
                        ))
                     ) : (
                        <p className="text-xs text-gray-600 px-3">No active tickets</p>
                     )}
                  </div>
               )}
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-1 bg-dark-secondary border border-gray-800 rounded-xl flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-dark-tertiary">
               <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'global' ? 'bg-indigo-500' :
                     activeTab === 'team' ? 'bg-purple-500' : 'bg-green-500'
                     }`}>
                     <i className={`fa-solid ${activeTab === 'global' ? 'fa-globe' :
                        activeTab === 'team' ? 'fa-users' : 'fa-headset'
                        } text-white`}></i>
                  </div>
                  <div>
                     <h3 className="text-white font-bold">
                        {selectedChat?.name || (activeTab === 'global' ? 'Company Global' :
                           activeTab === 'team' ? 'Department Team' : 'Help Desk')}
                     </h3>
                     <p className="text-xs text-green-400 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                        Online
                     </p>
                  </div>
               </div>

               {isCompanyAdmin && (
                  <button
                     onClick={handleClearChat}
                     className="text-gray-400 hover:text-red-500 transition text-sm flex items-center space-x-1 px-3 py-1.5 rounded hover:bg-red-500 hover:bg-opacity-10"
                     title="Clear entire chat history"
                  >
                     <i className="fa-solid fa-trash-can"></i>
                     <span>Clear Chat</span>
                  </button>
               )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ backgroundImage: 'radial-gradient(circle at center, #1f2937 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
               {messages.length > 0 ? (
                  messages.map((msg, idx) => {
                     const isMe = msg.sender?._id === userData?._id;
                     return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                           <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>

                              {!isMe && (
                                 <span className="text-xs text-gray-400 mb-1 ml-1">
                                    {msg.sender?.name || 'Unknown'}
                                    <span className="text-[10px] bg-gray-700 px-1 rounded ml-1 text-white border border-gray-600">
                                       {formatRole(msg.sender?.role)}
                                    </span>
                                 </span>
                              )}

                              <div className={`relative px-4 py-3 rounded-2xl text-sm shadow-md ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-dark-tertiary text-gray-200 rounded-bl-none border border-gray-700'
                                 }`}>
                                 {editingMessageId === msg._id ? (
                                    <div className="flex flex-col space-y-2 min-w-[200px]">
                                       <input
                                          value={editInput}
                                          onChange={e => setEditInput(e.target.value)}
                                          className="bg-black bg-opacity-20 border border-white border-opacity-20 rounded px-2 py-1 text-white text-sm focus:outline-none"
                                          autoFocus
                                       />
                                       <div className="flex justify-end space-x-2 text-xs">
                                          <button onClick={handleEditCancel} className="text-white opacity-70 hover:opacity-100">Cancel</button>
                                          <button onClick={() => handleEditSave(msg._id)} className="font-bold hover:underline">Save</button>
                                       </div>
                                    </div>
                                 ) : (
                                    <>
                                       <p className="whitespace-pre-wrap">{msg.text}</p>
                                       {msg.isEdited && <span className="text-[10px] opacity-50 block text-right mt-1 italic">edited</span>}
                                    </>
                                 )}

                                 {isMe && !editingMessageId && (
                                    <div className="absolute top-0 right-full mr-2 opacity-0 group-hover:opacity-100 transition flex items-center space-x-1 pt-2">
                                       <button onClick={() => handleEditStart(msg)} className="w-6 h-6 rounded-full bg-dark-tertiary text-gray-400 hover:text-white flex items-center justify-center text-xs shadow-lg"><i className="fa-solid fa-pen"></i></button>
                                       <button onClick={() => handleDelete(msg._id)} className="w-6 h-6 rounded-full bg-dark-tertiary text-gray-400 hover:text-red-500 flex items-center justify-center text-xs shadow-lg"><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                 )}
                              </div>
                              <span className="text-[10px] text-gray-500 mt-1 mx-1">
                                 {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                        </div>
                     );
                  })
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                     <i className="fa-regular fa-comments text-5xl mb-4"></i>
                     <p>No messages yet. Start the conversation!</p>
                  </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-dark-tertiary border-t border-gray-800">
               <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                  <button type="button" className="text-gray-400 hover:text-white transition p-2 rounded-full hover:bg-gray-700">
                     <i className="fa-solid fa-paperclip"></i>
                  </button>
                  <div className="flex-1 relative">
                     <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full bg-dark-secondary border border-gray-700 rounded-full pl-5 pr-12 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
                     />
                     <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition"
                     >
                        <i className="fa-regular fa-face-smile"></i>
                     </button>
                  </div>
                  <button
                     type="submit"
                     disabled={!messageInput.trim()}
                     className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg shadow-indigo-900/30 group"
                  >
                     <i className="fa-solid fa-paper-plane group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
                  </button>
               </form>
            </div>
         </div>
      </div>
   );
};

export default Chat;
