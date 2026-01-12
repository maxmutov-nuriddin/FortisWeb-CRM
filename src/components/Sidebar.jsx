/* eslint-disable react-hooks/set-state-in-effect */
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
import { useTaskStore } from '../store/task.store';

const Sidebar = ({ isOpen, toggleSidebar }) => {
   const { t } = useTranslation();
   const navigate = useNavigate()
   const location = useLocation();

   const { user, logout, error: authError } = useAuthStore();
   const { projects, getProjectsByCompany, getAllProjects } = useProjectStore();
   const { users, getUsersByCompany, getAllUsers } = useUserStore();
   const { companies, getCompanies } = useCompanyStore();
   const { chats } = useChatStore();
   const { updateUserStatus } = useUserStore();
   const { tasks, getTasksByUser } = useTaskStore();

   useEffect(() => {
      const userData = user?.data?.user || user?.user || user;
      if (userData?._id && (userData.role === 'worker' || userData.role === 'team_lead')) {
         getTasksByUser(userData._id);
      }
   }, [user, user?.role]);

   const userData = user?.data?.user || user?.user || user;
   const currentUserId = userData?._id;
   const isSuperAdmin = userData?.role === 'super_admin';

   // ===================== COUNTS =====================
   const newChatsCount =
      chats?.data?.chats?.filter((chat) => {
         const readBy = chat?.lastMessage?.readBy || [];
         return !readBy.includes(currentUserId);
      }).length || 0;

   const allTasks = Array.isArray(tasks) ? tasks : tasks?.data?.tasks || [];
   const newTasksCount = allTasks.filter(t =>
      String(t.assignedTo?._id || t.assignedTo || '') === String(currentUserId) &&
      t.status === 'todo'
   ).length;

   const newOrdersCount =
      projects?.data?.projects?.filter(
         (project) => {
            const isPending = project.status === 'pending';
            if (!isPending) return false;

            const role = userData?.role;
            if (role === 'super_admin' || role === 'company_admin' || role === 'team_lead') return true;

            // if (role === 'team_lead') {
            //    const directMatch = String(project.teamLead?._id || project.teamLead || '') === String(currentUserId);
            //    const teamMatch = String(project.assignedTeam?.teamLead?._id || project.assignedTeam?.teamLead || '') === String(currentUserId);
            //    return directMatch || teamMatch;
            // }

            const isAssigned = project.assignedMembers?.some(m => String(m.user?._id || m.user || m) === String(currentUserId));
            if (isAssigned) {
               const userTasks = allTasks.filter(t => String(t.assignedTo?._id || t.assignedTo || '') === String(currentUserId));
               const projectTasks = userTasks.filter(t => String(t.project?._id || t.project || '') === String(project._id));
               if (projectTasks.length === 0) return false;
               const hasCompletedTask = projectTasks.some(t => t.status === 'completed');
               if (hasCompletedTask) return false;
               return true;
            }
            return false;
         }
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

      let filteredProjects = projectsList;
      if (!isSuperAdmin && userData?.role !== 'company_admin') {
         filteredProjects = projectsList.filter(p => {
            const isAssigned = p.assignedMembers?.some(m => String(m.user?._id || m.user || m) === currentUserId);
            return isAssigned || String(p.team?._id || p.team || '') !== '';
         });
      }

      setActiveProjectsCount(filteredProjects.filter(p => ['in_progress', 'review', 'revision'].includes(p.status)).length);
      setTeamMembersCount(usersList.length);
   }, [projects, users, userData, isSuperAdmin, currentUserId]);

   const isActive = (path) => {
      if (path === '/' && location.pathname !== '/') return 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800/50';
      return location.pathname.startsWith(path) && (path !== '/' || location.pathname === '/')
         ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg shadow-gray-900/10 dark:shadow-white/5'
         : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800/50';
   };

   const handleLogout = () => {
      if (window.confirm(t('logout_confirm'))) {
         try {
            if (userData?._id) updateUserStatus(userData._id, false);
            logout();
            navigate('/signin');
         } catch (e) {
            console.error(e);
         }
      }
   }

   return (
      <>
         {/* Mobile Overlay */}
         {isOpen && (
            <div
               className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden transition-opacity"
               onClick={toggleSidebar}
            ></div>
         )}

         <aside
            id="sidebar"
            className={`
            fixed inset-y-0 left-0 z-30 w-72 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-r border-gray-100 dark:border-zinc-800 flex flex-col h-full transform transition-all duration-300 ease-in-out
            md:static md:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
         `}>
            {/* Logo Section */}
            <div id="logo-section" className="h-20 flex items-center px-8 border-b border-gray-100 dark:border-zinc-800/50">
               <Link to="/" className="flex items-center space-x-3 group">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform duration-300">
                     <span className="font-bold text-md">FWB</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">FortisWeb</h2>
               </Link>
            </div>

            {/* Navigation */}
            <nav id="sidebar-nav" className="flex-1 py-8 px-5 overflow-y-auto custom-scrollbar space-y-1">
               {[
                  { path: '/', icon: 'fa-chart-pie', label: 'dashboard' },
                  // Company: Super Admin or Company Admin (view own)
                  ...(['super_admin',].includes(userData?.role) ? [{ path: '/company', icon: 'fa-building', label: 'company' }] : []),
                  // Orders: Not for employees
                  ...(!['employee', 'worker', 'frontend', 'backend', 'marketer', 'designer'].includes(userData?.role) ? [{ path: '/orders', icon: 'fa-file-invoice', label: 'orders', count: newOrdersCount, color: 'bg-red-500' }] : []),
                  // Profiles: Not for employees (only leads/admins)
                  ...(!['employee', 'worker', 'frontend', 'backend', 'marketer', 'designer'].includes(userData?.role) ? [{ path: '/profiles', icon: 'fa-users', label: 'profiles' }] : []),
                  { path: '/tasks', icon: 'fa-list-check', label: 'tasks', count: newTasksCount, color: 'bg-red-500' },
                  { path: '/team-chats', icon: 'fa-comments', label: 'team_chats', count: newChatsCount, color: 'bg-green-500' },
                  { path: '/payments', icon: 'fa-wallet', label: 'payments' },
                  // Projects: Not for employees (Same as Orders mostly)
                  { path: '/projects', icon: 'fa-layer-group', label: 'projects' },
                  { path: '/settings', icon: 'fa-gear', label: 'settings' },
               ].map((item, index) => (
                  <Link
                     key={index}
                     to={item.path}
                     className={`flex items-center space-x-3.5 px-5 py-3.5 rounded-2xl transition-all duration-200 font-medium text-sm group ${isActive(item.path)}`}
                  >
                     <i className={`fa-solid ${item.icon} w-5 text-center transition-transform group-hover:scale-110`}></i>
                     <span>{t(item.label)}</span>
                     {item.count > 0 && (
                        <span className={`text-xs font-bold text-white ml-auto ${item.color} px-2 py-0.5 rounded-full shadow-sm`} >
                           {item.count}
                        </span>
                     )}
                  </Link>
               ))}

               {/* Quick Stats Card */}
               <div className="mt-10 px-2">
                  <div className="bg-gradient-to-br from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                     {/* Decorative background element */}
                     <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-colors"></div>

                     <div className="flex items-center gap-2 mb-4 relative z-10">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-black flex items-center justify-center shadow-sm text-red-500">
                           <i className="fa-solid fa-bolt text-xs"></i>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('quick_stats')}</span>
                     </div>

                     <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div>
                           <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeProjectsCount}</div>
                           <div className="text-[10px] font-medium text-gray-500 truncate">{t('active_projects')}</div>
                        </div>
                        <div>
                           <div className="text-2xl font-bold text-gray-900 dark:text-white">{teamMembersCount}</div>
                           <div className="text-[10px] font-medium text-gray-500 truncate">{t('team_members')}</div>
                        </div>
                     </div>
                  </div>
               </div>
            </nav>

            {/* Footer */}
            <div id="sidebar-footer" className="p-6 border-t border-gray-100 dark:border-zinc-800/50">
               <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group" onClick={() => navigate('/settings')}>
                  <div className="flex items-center gap-3 overflow-hidden">
                     <img
                        src={userData?.avatar || `https://ui-avatars.com/api/?name=${userData?.name}`}
                        className="w-10 h-10 rounded-xl border border-white dark:border-zinc-700 shadow-sm object-cover"
                        alt={userData?.name}
                     />
                     <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{userData?.name || 'User'}</div>
                        <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">{userData?.role?.replace('_', ' ') || 'Guest'}</div>
                     </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="text-gray-400 hover:text-red-500 transition-colors p-2">
                     <i className="fa-solid fa-arrow-right-from-bracket"></i>
                  </button>
               </div>
            </div>
         </aside >
      </>
   );
};

export default Sidebar;
