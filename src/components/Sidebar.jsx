/* eslint-disable no-unused-vars */
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/user.store';
import { useChatStore } from '../store/chat.store';
import { useProjectStore } from '../store/project.store';


const Sidebar = ({ isOpen, toggleSidebar }) => {
   const navigate = useNavigate()
   const location = useLocation();

   const { user, logout, isLoading: authLoading, error: authError } = useAuthStore();
   const { projects, getProjectsByCompany, error: projectsError } = useProjectStore();
   const { chats, error: chatsError } = useChatStore();
   const { updateUserStatus } = useUserStore();


   const currentUserId = user?._id;

   // ===================== COUNTS =====================
   const newChatsCount =
      chats?.data?.chats?.filter((chat) => {
         const readBy = chat?.lastMessage?.readBy || [];
         return !readBy.includes(currentUserId);
      }).length || 0;

   const newOrdersCount =
      projects?.data?.projects?.filter(
         (project) => project.status === 'pending'
      ).length || 0;

   // ===================== AUTH =====================


   // ===================== PROJECTS =====================
   useEffect(() => {
      const companyId = user?.data?.user?.company?._id;
      if (!companyId) return;
      getProjectsByCompany(companyId);
   }, [user?.data?.user?.company?._id]);

   // ===================== ERRORS =====================
   useEffect(() => {
      if (authError) console.error(authError);
      if (projectsError) console.error(projectsError);
      if (chatsError) console.error(chatsError);
   }, [authError, projectsError, chatsError]);

   // Check if link is active, including sub-routes or specific matches
   const isActive = (path) => {
      if (path === '/' && location.pathname !== '/') return 'text-gray-400 hover:bg-dark-tertiary hover:text-white';
      return location.pathname.startsWith(path) && (path !== '/' || location.pathname === '/')
         ? 'bg-dark-accent text-white'
         : 'text-gray-400 hover:bg-dark-tertiary hover:text-white';
   };

   // HandelLogOut

   const handleLogout = () => {
      toast.warn(
         ({ closeToast }) => (
            <div className="text-sm">
               <p className="mb-3 text-white">
                  Are you sure you want to log out?
               </p>

               <div className="flex justify-end gap-2">
                  <button
                     onClick={closeToast}
                     className="px-3 py-1 rounded bg-gray-600 text-white text-xs"
                  >
                     Cancel
                  </button>

                  <button
                     onClick={async () => {
                        try {
                           if (user?.data?.user?._id) {
                              await updateUserStatus(user.data.user._id, false)
                           }

                           logout();
                           closeToast()
                           navigate('/signin')
                        } catch (e) {
                           console.error(e)
                        }
                     }}
                     className="px-3 py-1 rounded bg-red-600 text-white text-xs"
                  >
                     Log out
                  </button>
               </div>
            </div>
         ),
         {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         }
      )
   }



   // ===================== AUTH =====================


   // ===================== ERRORS =====================
   useEffect(() => {
      if (authError) console.error(authError)
   }, [authError])

   return (
      <>
         <aside
            id="sidebar"
            className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-dark-secondary border-r border-gray-800 flex flex-col h-full transform transition-transform duration-300 ease-in-out
            md:static md:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
         `}>
            <div id="logo-section" className="p-6 border-b border-gray-800">
               <Link to="/" className="flex items-center space-x-3">
                  <div className="w-12 h-12 flex items-center justify-center">
                     <img className='rounded-full border-2 border-dark-accent' src="fortislogo.JPG" alt="" />
                  </div>
                  <span className="text-xl font-bold text-white">FortisWeb</span>
               </Link>
            </div>

            <nav id="sidebar-nav" className="flex-1 py-6 px-3 overflow-y-auto">
               <div className="space-y-1">
                  <Link to="/" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/')}`}>
                     <i className="fa-solid fa-chart-line w-5"></i>
                     <span className="font-medium">Dashboard</span>
                  </Link>
                  <Link to="/company" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/company')}`}>
                     <i className="fa-solid fa-building w-5"></i>
                     <span className="font-medium">Company</span>
                  </Link>
                  <Link to="/orders" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/orders')}`}>
                     <i className="fa-brands fa-telegram w-5"></i>
                     <span className="font-medium">Orders</span>
                     {newOrdersCount > 0 && (
                        <span className="ml-auto bg-dark-accent text-white text-xs px-2 py-1 rounded-full">{newOrdersCount}</span>
                     )}
                  </Link>
                  <Link to="/profiles" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/profiles')}`}>
                     <i className="fa-solid fa-users w-5"></i>
                     <span className="font-medium">Profiles</span>
                  </Link>
                  <Link to="/tasks" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/tasks')}`}>
                     <i className="fa-solid fa-tasks w-5"></i>
                     <span className="font-medium">Tasks</span>
                  </Link>
                  <Link to="/team-chats" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/team')}`}>
                     <i className="fa-solid fa-comments w-5"></i>
                     <span className="font-medium">Team Chats</span>
                     {newChatsCount > 0 && (
                        <span className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-full">{newChatsCount}</span>
                     )}
                  </Link>
                  <Link to="/payments" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/payments')}`}>
                     <i className="fa-solid fa-credit-card w-5"></i>
                     <span className="font-medium">Payments</span>
                  </Link>
                  <Link to="/projects" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/projects')}`}>
                     <i className="fa-solid fa-folder-open w-5"></i>
                     <span className="font-medium">Projects</span>
                  </Link>
                  <Link to="/settings" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/settings')}`}>
                     <i className="fa-solid fa-cog w-5"></i>
                     <span className="font-medium">Settings</span>
                  </Link>
               </div>

               <div className="mt-8 px-4">
                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700">
                     <div className="flex items-center space-x-2 mb-2">
                        <i className="fa-solid fa-bolt text-dark-accent"></i>
                        <span className="text-sm font-semibold text-white">Quick Stats</span>
                     </div>
                     <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                           <span className="text-gray-400">Active Projects</span>
                           <span className="text-white font-semibold">24</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-gray-400">Team Members</span>
                           <span className="text-white font-semibold">18</span>
                        </div>
                     </div>
                  </div>
               </div>
            </nav>

            <div id="sidebar-footer" className="p-4 border-t border-gray-800">
               <div className="flex items-center space-x-3">
                  <img
                     src={user?.data?.user.avatar || `https://ui-avatars.com/api/?name=${user?.data?.user.name}`}
                     className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-dark-accent"
                  />
                  <div className="flex-1">
                     <div className="text-md font-medium text-white">{user?.data?.user.name}</div>
                     <div className="text-xs text-dark-accent">{user?.data?.user?.role}</div>
                  </div>
                  <i
                     onClick={handleLogout}
                     className="fa-solid fa-sign-out-alt text-gray-400 hover:text-white cursor-pointer"
                  />
               </div>
            </div>
         </aside>
      </>
   );
};

export default Sidebar;
