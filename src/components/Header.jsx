import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useProjectStore } from '../store/project.store';
import { useChatStore } from '../store/chat.store';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../store/task.store';

const Header = ({ toggleSidebar }) => {
   const { t } = useTranslation();
   const { user, error: authError } = useAuthStore();
   const { projects, getProjectsByCompany, error: projectsError } = useProjectStore();
   const { chats, error: chatsError } = useChatStore();
   const { tasks, getTasksByUser } = useTaskStore();

   useEffect(() => {
      const userData = user?.data?.user || user?.user || user;
      if (userData?._id && (userData.role === 'worker' || userData.role === 'team_lead')) {
         getTasksByUser(userData._id);
      }
   }, [user?.data?.user?._id, user?.user?._id, user?._id, user?.data?.user?.role, user?.user?.role, user?.role]);

   const userData = user?.data?.user || user?.user || user;
   const currentUserId = userData?._id;

   // ===================== COUNTS =====================
   const newChatsCount =
      chats?.data?.chats?.filter((chat) => {
         const readBy = chat?.lastMessage?.readBy || [];
         return !readBy.includes(currentUserId);
      }).length || 0;

   // Calculate new tasks count (status === 'todo')
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

            // Role-based filtering
            const role = userData?.role;
            if (role === 'super_admin' || role === 'company_admin') return true;

            if (role === 'team_lead') {
               return String(project.teamLead?._id || project.teamLead || '') === String(currentUserId);
            }

            // Worker
            const isAssigned = project.assignedMembers?.some(m => String(m.user?._id || m.user || m) === String(currentUserId));

            if (isAssigned) {
               // Ensure we only check tasks assigned to THIS user (handling stale store data)
               const userTasks = allTasks.filter(t => String(t.assignedTo?._id || t.assignedTo || '') === String(currentUserId));

               // Filter tasks for this specific project
               const projectTasks = userTasks.filter(t => String(t.project?._id || t.project || '') === String(project._id));

               // 1. If no tasks assigned yet -> Hide notification
               if (projectTasks.length === 0) return false;

               // 2. If has completed task -> Hide notification
               const hasCompletedTask = projectTasks.some(t => t.status === 'completed');
               if (hasCompletedTask) return false;

               // 3. Has active tasks -> Show notification
               return true;
            }
            return false;
         }
      ).length || 0;

   // ===================== AUTH =====================


   // ===================== PROJECTS =====================
   useEffect(() => {
      const companyId = userData?.company?._id || userData?.company;
      if (!companyId) return;
      getProjectsByCompany(companyId);
   }, [userData?.company?._id || userData?.company]);

   // ===================== ERRORS =====================
   useEffect(() => {
      if (authError) console.error(authError);
      if (projectsError) console.error(projectsError);
      if (chatsError) console.error(chatsError);
   }, [authError, projectsError, chatsError]);

   return (
      <>
         <header id="header" className="bg-white dark:bg-dark-secondary border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 py-4 shrink-0 transition-all duration-300">
            <div className="flex items-center justify-between gap-4">

               {/* Left Side: Hamburger & Search */}
               <div className="flex items-center space-x-4 flex-1">
                  {/* Hamburger Menu (Mobile Only) */}
                  <button
                     onClick={toggleSidebar}
                     className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none"
                  >
                     <i className="fa-solid fa-bars text-xl"></i>
                  </button>

                  {/* Search Bar */}
                  {/* <div className="relative flex-1 max-w-md hidden sm:block">
                     <i className="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                     <input type="text" placeholder={t('search')} className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-gray-700 rounded-lg pl-11 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-dark-accent transition-colors" />
                  </div> */}
                  {/* Mobile Search Icon (optional replacement for full bar) */}
                  <button className="sm:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                     <i className="fa-solid fa-search text-xl"></i>
                  </button>
               </div>

               {/* Right Side: Icons & Profile */}
               <div className="flex items-center space-x-3 md:space-x-6">
                  <Link title={t('orders')} to="/orders" className="relative text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                     <i className="fa-solid fa-bell text-xl"></i>
                     {newOrdersCount || newTasksCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-dark-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{newOrdersCount + newTasksCount   }</span>
                     )}
                  </Link>
                  <Link title={t('team_chats')} to="/team-chats" className="relative text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                     <i className="fa-solid fa-comment-dots text-xl"></i>
                     {newChatsCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{newChatsCount}</span>
                     )}
                  </Link>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>

                  {/* Profile Section */}
                  <Link to="/settings" className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-tertiary px-2 py-1 md:px-3 md:py-2 rounded-lg transition-colors">
                     <img
                        src={userData?.avatar || `https://ui-avatars.com/api/?name=${userData?.name}`}
                        className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-dark-accent object-cover"
                        alt={userData?.name}
                     />
                     <div className="hidden md:block">
                        <div className="text-md font-medium text-gray-900 dark:text-white">{userData?.name || 'User'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userData?.role?.replace('_', ' ') || 'Guest'}</div>
                     </div>
                  </Link>
               </div>
            </div>
         </header >
      </>
   );

};

export default Header;
