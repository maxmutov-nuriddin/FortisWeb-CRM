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
   }, [user?.role]);

   const userData = user?.data?.user || user?.user || user;
   const currentUserId = userData?._id;

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
            if (role === 'super_admin' || role === 'company_admin') return true;

            if (role === 'team_lead') {
               return String(project.teamLead?._id || project.teamLead || '') === String(currentUserId);
            }

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

   useEffect(() => {
      const companyId = userData?.company?._id || userData?.company;
      if (!companyId) return;
      getProjectsByCompany(companyId);
   }, [userData?.company]);

   useEffect(() => {
      if (authError) console.error(authError);
      if (projectsError) console.error(projectsError);
      if (chatsError) console.error(chatsError);
   }, [authError, projectsError, chatsError]);

   return (
      <header id="header" className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 transition-all duration-300">
         <div className="flex items-center justify-between px-6 py-3">

            {/* Left: Toggle Button for screens ≤1280px */}
            <div className="flex items-center gap-4">
               <button
                  onClick={toggleSidebar}
                  className="xl:hidden w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
               >
                  <i className="fa-solid fa-bars text-lg"></i>
               </button>

               {/* Breadcrumbs or Page Title could go here */}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-1.5 rounded-2xl">
                  <Link
                     to="/orders"
                     className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all relative group"
                     title={t('orders')}
                  >
                     <i className="fa-regular fa-bell text-lg"></i>
                     {(newOrdersCount || newTasksCount) > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                     )}
                  </Link>

                  <Link
                     to="/team-chats"
                     className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all relative group"
                     title={t('team_chats')}
                  >
                     <i className="fa-regular fa-comment-dots text-lg"></i>
                     {newChatsCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                     )}
                  </Link>
               </div>

               <div className="h-8 w-px bg-gray-200 dark:bg-zinc-800 mx-1"></div>

               <Link to="/settings" className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors group">
                  <div className="text-right hidden sm:block">
                     <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{userData?.name || 'User'}</div>
                     <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{userData?.role?.replace('_', ' ') || 'Guest'}</div>
                  </div>
                  <img
                     src={userData?.avatar || `https://ui-avatars.com/api/?name=${userData?.name}`}
                     className="w-10 h-10 rounded-xl border-2 border-white dark:border-zinc-800 shadow-sm object-cover"
                     alt={userData?.name}
                  />
               </Link>
            </div>
         </div>
      </header>
   );
};

export default Header;
