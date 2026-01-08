/* eslint-disable no-unused-vars */
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/user.store';
import { useChatStore } from '../store/chat.store';
import { useProjectStore } from '../store/project.store';
import { useTranslation } from 'react-i18next';
import { useCompanyStore } from '../store/company.store';


const Sidebar = ({ isOpen, toggleSidebar }) => {
   const { t } = useTranslation();
   const navigate = useNavigate()
   const location = useLocation();

   const { user, logout, error: authError } = useAuthStore();
   const { projects, getProjectsByCompany, getAllProjects, error: projectsError } = useProjectStore();
   const { users, getUsersByCompany, getAllUsers, error: usersError } = useUserStore();
   const { companies, getCompanies } = useCompanyStore();
   const { chats, error: chatsError } = useChatStore();
   const { updateUserStatus } = useUserStore();

   const userData = user?.data?.user || user?.user || user;
   const currentUserId = userData?._id;
   const isSuperAdmin = userData?.role === 'super_admin';

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

   // ===================== STATS LOGIC =====================
   const [activeProjectsCount, setActiveProjectsCount] = React.useState(0);
   const [teamMembersCount, setTeamMembersCount] = React.useState(0);

   useEffect(() => {
      const initSidebarData = async () => {
         if (!userData) return;
         const companyId = userData.company?._id || userData.company;

         if (isSuperAdmin) {
            const res = await getCompanies();
            const companiesList = res?.data?.companies || res?.companies || (Array.isArray(res) ? res : []);
            const companyIds = companiesList.map(c => c._id).filter(Boolean);
            if (companyIds.length > 0) {
               getAllProjects(companyIds);
               getAllUsers(companyIds);
            }
         } else if (companyId) {
            getProjectsByCompany(companyId);
            getUsersByCompany(companyId);
         }
      };
      initSidebarData();
   }, [userData, isSuperAdmin]);

   useEffect(() => {
      const projectsList = projects?.data?.projects || (Array.isArray(projects) ? projects : []);
      const usersList = users?.data?.users || (Array.isArray(users) ? users : []);

      // Role-based filtering for projects (similar to Dashboard)
      let filteredProjects = projectsList;
      if (!isSuperAdmin && userData?.role !== 'company_admin') {
         filteredProjects = projectsList.filter(p => {
            const isAssigned = p.assignedMembers?.some(m => String(m.user?._id || m.user || m) === currentUserId);
            return isAssigned || String(p.team?._id || p.team || '') !== ''; // Simplified for sidebar
         });
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveProjectsCount(filteredProjects.filter(p => ['in_progress', 'review', 'revision'].includes(p.status)).length);
      setTeamMembersCount(usersList.length);
   }, [projects, users, userData, isSuperAdmin, currentUserId]);

   // Check if link is active, including sub-routes or specific matches
   const isActive = (path) => {
      if (path === '/' && location.pathname !== '/') return 'text-gray-400 hover:bg-dark-tertiary hover:text-white';
      return location.pathname.startsWith(path) && (path !== '/' || location.pathname === '/')
         ? 'bg-dark-accent text-white'
         : 'text-gray-400 hover:bg-dark-tertiary hover:text-white';
   };

   const handleLogout = () => {
      toast.warn(
         ({ closeToast }) => (
            <div className="text-sm">
               <p className="mb-3 text-white">
                  {t('logout_confirm')}
               </p>

               <div className="flex justify-end gap-2">
                  <button
                     onClick={closeToast}
                     className="px-3 py-1 rounded bg-gray-600 text-white text-xs"
                  >
                     {t('cancel')}
                  </button>

                  <button
                     onClick={async () => {
                        try {
                           if (userData?._id) {
                              await updateUserStatus(userData._id, false)
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
                     {t('logout')}
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

   // ===================== ERRORS =====================
   useEffect(() => {
      if (authError) console.error(authError);
      if (projectsError) console.error(projectsError);
      if (chatsError) console.error(chatsError);
      if (usersError) console.error(usersError);
   }, [authError, projectsError, chatsError, usersError]);

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
                     <span className="font-medium">{t('dashboard')}</span>
                  </Link>
                  {(userData?.role === 'super_admin') && (
                     <Link to="/company" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/company')}`}>
                        <i className="fa-solid fa-building w-5"></i>
                        <span className="font-medium">{t('company')}</span>
                     </Link>
                  )}
                  <Link to="/orders" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/orders')}`}>
                     <i className="fa-brands fa-telegram w-5"></i>
                     <span className="font-medium">{t('orders')}</span>
                     {newOrdersCount > 0 && (
                        <span className="ml-auto bg-dark-accent text-white text-xs px-2 py-1 rounded-full">{newOrdersCount}</span>
                     )}
                  </Link>
                  <Link to="/profiles" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/profiles')}`}>
                     <i className="fa-solid fa-users w-5"></i>
                     <span className="font-medium">{t('profiles')}</span>
                  </Link>
                  <Link to="/tasks" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/tasks')}`}>
                     <i className="fa-solid fa-tasks w-5"></i>
                     <span className="font-medium">{t('tasks')}</span>
                  </Link>
                  <Link to="/team-chats" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/team')}`}>
                     <i className="fa-solid fa-comments w-5"></i>
                     <span className="font-medium">{t('team_chats')}</span>
                     {newChatsCount > 0 && (
                        <span className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-full">{newChatsCount}</span>
                     )}
                  </Link>
                  <Link to="/payments" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/payments')}`}>
                     <i className="fa-solid fa-credit-card w-5"></i>
                     <span className="font-medium">{t('payments')}</span>
                  </Link>
                  <Link to="/projects" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/projects')}`}>
                     <i className="fa-solid fa-folder-open w-5"></i>
                     <span className="font-medium">{t('projects')}</span>
                  </Link>
                  <Link to="/settings" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/settings')}`}>
                     <i className="fa-solid fa-cog w-5"></i>
                     <span className="font-medium">{t('settings')}</span>
                  </Link>
               </div>

               <div className="mt-8 px-4">
                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700">
                     <div className="flex items-center space-x-2 mb-2">
                        <i className="fa-solid fa-bolt text-dark-accent"></i>
                        <span className="text-sm font-semibold text-white">{t('quick_stats')}</span>
                     </div>
                     <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                           <span className="text-gray-400">{t('active_projects')}</span>
                           <span className="text-white font-semibold">{activeProjectsCount}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-gray-400">{t('team_members')}</span>
                           <span className="text-white font-semibold">{teamMembersCount}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </nav>

            <div id="sidebar-footer" className="p-4 border-t border-gray-800">
               <div className="flex items-center space-x-3">
                  <img
                     src={userData?.avatar || `https://ui-avatars.com/api/?name=${userData?.name}`}
                     className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-dark-accent object-cover"
                     alt={userData?.name}
                  />
                  <div className="flex-1 min-w-0">
                     <div className="text-sm font-medium text-white truncate">{userData?.name || 'User'}</div>
                     <div className="text-xs text-dark-accent truncate capitalize">{userData?.role?.replace('_', ' ') || 'Guest'}</div>
                  </div>
                  <i
                     onClick={handleLogout}
                     className="fa-solid fa-sign-out-alt text-gray-400 hover:text-white cursor-pointer transition-colors"
                  />
               </div>
            </div>
         </aside>
      </>
   );
};


export default Sidebar;
