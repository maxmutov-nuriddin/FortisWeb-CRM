/* eslint-disable react-hooks/immutability */
/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import { useTaskStore } from '../store/task.store';
import { useAuthStore } from '../store/auth.store';
import { useProjectStore } from '../store/project.store';
import { useUserStore } from '../store/user.store';
import { useCompanyStore } from '../store/company.store';
import { toast } from 'react-toastify';
import PageLoader from '../components/loader/PageLoader';
import { useTranslation } from 'react-i18next';

const Tasks = () => {
   const { t } = useTranslation();
   const { user: authUser } = useAuthStore();
   const {
      tasks,
      getTasksByUser,
      getTasksByProject,
      getTasksByCompany,
      getAllTasks,
      createTask,
      updateTask,
      deleteTask,
      updateTaskStatus,
      addTaskComment, // Add this
      getTasksByProjects,
      isLoading
   } = useTaskStore();

   const { projects, getAllProjects, getProjectsByCompany } = useProjectStore();
   const { users: companyUsers, getUsersByCompany, getAllUsers } = useUserStore();
   const { companies, getCompanies } = useCompanyStore();

   const [filter, setFilter] = useState('all');
   const [searchQuery, setSearchQuery] = useState('');
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [isViewModalOpen, setIsViewModalOpen] = useState(false);
   const [isCancelModalOpen, setIsCancelModalOpen] = useState(false); // New
   const [cancellationReason, setCancellationReason] = useState(''); // New
   const [taskToCancel, setTaskToCancel] = useState(null); // New
   const [currentTask, setCurrentTask] = useState(null);
   const [formData, setFormData] = useState({
      title: '',
      description: '',
      project: '',
      assignedTo: '',
      deadline: '',
      priority: 'medium',
      estimatedHours: 0,
      weight: 1
   });

   const user = authUser?.data?.user || authUser?.user || authUser;
   const role = user?.role;
   const userId = user?._id;
   const companyId = user?.company?._id || user?.company;
   const canManageTasks = ['super_admin', 'company_admin', 'team_lead'].includes(role);

   useEffect(() => {
      if (userId) {
         loadPageData();
      }
   }, [userId, role]);

   // Auto-transition to Overdue
   useEffect(() => {
      if (tasks && tasks.length > 0) {
         const now = new Date();
         tasks.forEach(task => {
            const isOverdue = new Date(task.deadline) < now;
            const isNotCompleted = task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'overdue';

            if (isOverdue && isNotCompleted) {
               // Prevent rapid firing if already updating? Store handles it, but let's be safe.
               // We only update if status is NOT 'overdue' in the local state.
               updateTaskStatus(task._id || task.id, { status: 'overdue' })
                  .then(() => console.log('Auto-marked task as overdue:', task.title))
                  .catch(err => console.error('Failed to auto-mark overdue', err));
            }
         });
      }
   }, [tasks, updateTaskStatus]);

   const loadPageData = async () => {
      try {
         if (role === 'super_admin') {
            console.log('Fetching data for Super Admin...');
            // 1. Get all companies
            const result = await getCompanies();
            const companyList = result?.data?.companies || result?.companies || result || [];
            const companyIds = companyList.map(c => c._id || c.id).filter(Boolean);

            // 2. Fetch projects and users for these companies
            if (companyIds.length > 0) {
               const results = await Promise.all([
                  getAllProjects(companyIds),
                  getAllUsers(companyIds)
               ]);

               // 3. Extract projects and fetch their tasks
               const projectsResult = results[0];
               const projectsArray = projectsResult?.data?.projects || projectsResult?.projects || (Array.isArray(projectsResult) ? projectsResult : []);
               const projectIds = projectsArray.map(p => p._id || p.id).filter(Boolean);

               if (projectIds.length > 0) {
                  await getTasksByProjects(projectIds);
               } else {
                  useTaskStore.setState({ tasks: [] });
               }
            } else {
               useTaskStore.setState({ tasks: [] });
            }
         } else if (role === 'company_admin' || role === 'team_lead') {
            if (companyId) {
               console.log(`Fetching data for ${role}...`);
               // Parallel fetch projects and users
               const [projResult] = await Promise.all([
                  getProjectsByCompany(companyId),
                  getUsersByCompany(companyId)
               ]);

               let projs = projResult?.data?.projects || projResult?.projects || (Array.isArray(projResult) ? projResult : []);

               // Filter for Team Lead
               if (role === 'team_lead') {
                  const currentUserId = String(userId);
                  projs = projs.filter(p =>
                     String(p.teamLead?._id || p.teamLead || '') === currentUserId ||
                     (p.assignedMembers && p.assignedMembers.some(m => String(m.user?._id || m.user || m) === currentUserId))
                  );
               }

               const pIds = projs.map(p => p._id || p.id).filter(Boolean);
               if (pIds.length > 0) {
                  await getTasksByProjects(pIds);
               } else {
                  useTaskStore.setState({ tasks: [] });
               }
            }
         } else {
            // Worker role
            console.log('Fetching tasks for worker...');
            await getTasksByUser(userId);
            // Also need projects for context/options
            if (companyId) {
               await getProjectsByCompany(companyId);
            }
         }
      } catch (error) {
         console.error('Failed to load page data:', error);
      }
   };

   const taskList = useMemo(() => {
      const list = Array.isArray(tasks) ? tasks : tasks?.data?.tasks || tasks?.tasks || [];
      return list;
   }, [tasks]);

   const filteredTasks = useMemo(() => {
      let result = taskList;

      if (filter !== 'all') {
         result = result.filter(t => t.status === filter);
      }

      if (searchQuery) {
         const query = searchQuery.toLowerCase();
         result = result.filter(t =>
            t.title?.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query)
         );
      }

      return result;
   }, [taskList, filter, searchQuery]);

   const stats = useMemo(() => {
      const total = taskList.length;
      const inProgress = taskList.filter(t => t.status === 'in_progress').length;
      const completed = taskList.filter(t => t.status === 'completed').length;

      // Overdue is now a status, but we can also count tasks that ARE overdue (status=overdue)
      // OR technically overdue but not yet updated? Better to just count status='overdue' + those past deadline not done?
      // Simplified: Count status === 'overdue'
      const overdue = taskList.filter(t => t.status === 'overdue').length;
      const cancelled = taskList.filter(t => t.status === 'cancelled').length;
      const avgCompletion = taskList.length > 0 ? (completed / total * 100).toFixed(1) + '%' : '0%';

      return { total, inProgress, completed, overdue, cancelled, avgCompletion };
   }, [taskList]);

   const handleStatusChange = async (taskId, newStatus) => {
      const id = taskId?._id || taskId?.id || taskId;
      const task = taskList.find(t => (t._id === id || t.id === id));

      if (task) {
         const isRestricted = task.status === 'overdue' || task.status === 'cancelled';
         if (isRestricted && !canManageTasks) {
            toast.error(t('cannot_change_status_from_' + task.status));
            return;
         }
      }

      // Restriction: Cannot manually move TO overdue (system only)
      if (newStatus === 'overdue') {
         if (task && new Date(task.deadline) > new Date()) {
            toast.error(t('task_not_yet_overdue'));
         } else {
            toast.error(t('cannot_set_overdue_manually'));
         }
         return;
      }

      try {
         // Requirement: 'cancelled' status MUST have a reason.
         // If attempting to set to 'cancelled' via drag/drop or generic button, redirect to modal.
         if (newStatus === 'cancelled') {
            handleOpenCancel(task);
            return;
         }

         await updateTaskStatus(id, { status: newStatus });
         toast.success(t('status_updated_to', { status: newStatus.replace('_', ' ') }));
      } catch (error) {
         toast.error('Failed to update status');
      }
   };

   // DND Handlers
   const onDragStart = (e, task) => {
      e.dataTransfer.setData('taskId', task._id || task.id);
      e.target.style.opacity = '0.5';
   };

   const onDragEnd = (e) => {
      e.target.style.opacity = '1';
   };

   const onDragOver = (e) => {
      e.preventDefault();
   };

   const onDrop = async (e, newStatus) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
         await handleStatusChange(taskId, newStatus);
      }
   };

   const handleTaskClick = (task) => {
      setCurrentTask(task);
      setIsViewModalOpen(true);
   };

   const handleDeleteTask = async (taskOrId) => {
      const id = taskOrId?._id || taskOrId?.id || taskOrId;
      if (window.confirm(t('confirm_delete_task'))) {
         try {
            await deleteTask(id);
            toast.success(t('task_deleted_success'));
         } catch (error) {
            toast.error(t('failed_delete_task'));
         }
      }
   }


   const handleOpenCancel = (task) => {
      setTaskToCancel(task);
      setCancellationReason('');
      setIsCancelModalOpen(true);
   };

   const handleConfirmCancel = async (e) => {
      e.preventDefault();
      if (!taskToCancel || !cancellationReason.trim()) return;

      try {
         const id = taskToCancel._id || taskToCancel.id;
         // 1. Add comment
         await addTaskComment(id, { text: `${t('task_cancelled_reason')}: ${cancellationReason}` });
         // 2. Update status
         await updateTaskStatus(id, { status: 'cancelled' });

         toast.success(t('task_cancelled_success'));
         setIsCancelModalOpen(false);
         setTaskToCancel(null);
      } catch (error) {
         toast.error(t('failed_cancel_task'));
      }
   };

   const handleOpenCreate = () => {
      setFormData({
         title: '',
         description: '',
         project: '',
         assignedTo: '',
         deadline: '',
         priority: 'medium',
         estimatedHours: 0,
         weight: 1
      });
      setIsCreateModalOpen(true);
   };

   const handleOpenEdit = (task) => {
      setCurrentTask(task);
      setFormData({
         title: task.title || '',
         description: task.description || '',
         project: task.project?._id || task.project || '',
         assignedTo: task.assignedTo?._id || task.assignedTo || '',
         deadline: task.deadline ? task.deadline.split('T')[0] : '',
         priority: task.priority || 'medium',
         estimatedHours: task.estimatedHours || 0,
         weight: task.weight || 1
      });
      setIsEditModalOpen(true);
   };





   const projectOptions = useMemo(() => {
      let list = Array.isArray(projects) ? projects : projects?.data?.projects || [];

      // Filter project options based on role
      if (role === 'team_lead') {
         const currentUserId = String(userId);
         list = list.filter(p =>
            String(p.teamLead?._id || p.teamLead || '') === currentUserId ||
            (p.assignedMembers && p.assignedMembers.some(m => String(m.user?._id || m.user || m) === currentUserId))
         );
      } else if (role !== 'super_admin' && role !== 'company_admin') {
         // Workers see only projects where they are members
         const currentUserId = String(userId);
         list = list.filter(p =>
            (p.assignedMembers && p.assignedMembers.some(m => String(m.user?._id || m.user || m) === currentUserId))
         );
      }

      return list;
   }, [projects, role, userId]);

   const userOptions = useMemo(() => {
      const allUsers = Array.isArray(companyUsers) ? companyUsers : companyUsers?.data?.users || [];
      if (!formData.project) return allUsers;

      const selectedProj = projectOptions.find(p => p._id === formData.project || p.id === formData.project);
      if (!selectedProj) return allUsers;

      // Extract member IDs from various possible locations in the project object
      // Based on Orders.jsx, projects often have 'assignedMembers' or 'team.members'
      let memberIds = [];

      const extractIds = (items) => {
         if (!items) return [];
         if (Array.isArray(items)) {
            return items.map(item => String(item._id || item.user?._id || item.user || item.id || item));
         }
         return [String(items._id || items.user?._id || items.user || items.id || items)];
      };

      const sourceFields = [
         selectedProj.assignedMembers,
         selectedProj.members,
         selectedProj.team?.members,
         selectedProj.team,
         selectedProj.assignedUsers,
         selectedProj.assignedTo
      ];

      sourceFields.forEach(field => {
         if (field) {
            memberIds = [...memberIds, ...extractIds(field)];
         }
      });

      // Unique IDs only
      memberIds = [...new Set(memberIds)];

      if (memberIds.length === 0) return allUsers;

      const filtered = allUsers.filter(u => {
         const uid = String(u._id || u.id);
         return memberIds.includes(uid);
      });

      // FALLBACK: If we found member IDs but they don't match any users (e.g. data mismatch),
      // or if somehow filtered is empty, return ALL users but SORT members if possible.
      // This ensures we always show SOMETHING in the dropdown.
      if (filtered.length > 0) return filtered;

      return allUsers;
   }, [companyUsers, formData.project, projectOptions]);

   const renderColumn = (title, status, colorClass) => {
      const columnTasks = filteredTasks.filter(t => t.status === status);
      const isOverdueCol = status === 'overdue';

      return (
         <div
            className="bg-gray-50 dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col h-[calc(100vh-280px)] min-w-[340px]"
            onDragOver={!isOverdueCol ? onDragOver : undefined}
            onDrop={!isOverdueCol ? (e) => onDrop(e, status) : undefined}
         >
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-gray-50 dark:bg-dark-secondary pb-2 z-10 transition-colors duration-300">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${colorClass}`}></div><span>{t(status)}</span>
               </h3>
               <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-dark-tertiary px-2 py-1 rounded">{columnTasks.length}</span>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
               {columnTasks.map(task => (
                  <div
                     key={task._id}
                     draggable
                     onDragStart={(e) => onDragStart(e, task)}
                     onDragEnd={onDragEnd}
                     onClick={() => handleTaskClick(task)}
                     className="bg-white dark:bg-dark-tertiary border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-dark-accent dark:hover:border-dark-accent transition cursor-pointer relative group"
                  >
                     <div className="flex items-start justify-between mb-2 gap-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{task.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${task.priority === 'urgent' ? 'bg-red-500 text-white' :
                           task.priority === 'high' ? 'bg-orange-500 text-white' :
                              task.priority === 'medium' ? 'bg-yellow-500 text-black' :
                                 'bg-blue-500 text-white'
                           }`}>{t(task.priority)}</span>
                     </div>
                     <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>

                     <div className="flex items-center space-x-2 mb-3">
                        <span className="text-[10px] bg-gray-100 dark:bg-dark-secondary text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                           {task.project?.title || t('no_project')}
                        </span>
                        {task.weight > 1 && (
                           <span className="text-[10px] bg-purple-500 bg-opacity-20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded">
                              {t('weight')}: {task.weight}
                           </span>
                        )}
                     </div>

                     <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center space-x-2">
                           <div className="w-6 h-6 rounded-full bg-dark-accent flex items-center justify-center text-[10px] text-white font-bold">
                              {task.assignedTo?.name?.[0] || 'U'}
                           </div>
                           <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{task.assignedTo?.name || t('unassigned')}</span>
                        </div>
                        <span className={`text-[10px] flex items-center space-x-1 ${new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'text-red-500' : 'text-gray-500'}`}>
                           <i className="fa-regular fa-calendar text-[9px]"></i>
                           <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : t('no_deadline')}</span>
                        </span>
                     </div>

                     {/* Action Overlay */}
                     <div className="absolute inset-0 bg-white dark:bg-dark-tertiary bg-opacity-95 dark:bg-opacity-95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center p-4">
                        <div className="flex flex-wrap gap-2 justify-center mb-4">
                           {/* Logic: Show buttons if status is standard OR if status is (overdue OR cancelled) AND user can manage */}
                           {(() => {
                              const isOverdue = status === 'overdue';
                              const isCancelled = status === 'cancelled';
                              const showActions = (!isOverdue && !isCancelled) || canManageTasks;

                              if (!showActions) return null;

                              return (
                                 <>
                                    {status !== 'todo' && <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task._id, 'todo'); }} className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-xs flex items-center justify-center" title={t('move_to_todo')}><i className="fa-solid fa-arrow-left"></i></button>}
                                    {status !== 'in_progress' && <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task._id, 'in_progress'); }} className="w-8 h-8 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-xs flex items-center justify-center" title={t('start_process')}><i className="fa-solid fa-play"></i></button>}
                                    {status !== 'review' && <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task._id, 'review'); }} className="w-8 h-8 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center justify-center" title={t('send_to_review')}><i className="fa-solid fa-eye"></i></button>}
                                    {status !== 'completed' && <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task._id, 'completed'); }} className="w-8 h-8 rounded bg-green-600 hover:bg-green-500 text-white text-xs flex items-center justify-center" title={t('complete')}><i className="fa-solid fa-check"></i></button>}
                                    {status !== 'cancelled' && status !== 'completed' && (
                                       <button onClick={(e) => { e.stopPropagation(); handleOpenCancel(task); }} className="w-8 h-8 rounded bg-red-500 hover:bg-red-400 text-white text-xs flex items-center justify-center" title={t('cancel_task')}><i className="fa-solid fa-ban"></i></button>
                                    )}
                                 </>
                              );
                           })()}
                        </div>
                        {canManageTasks && (
                           <div className="flex border-t border-gray-200 dark:border-gray-700 pt-3 gap-3 justify-center">
                              <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }} className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-xs flex items-center space-x-1">
                                 <i className="fa-solid fa-edit"></i><span>{t('edit')}</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }} className="text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs flex items-center space-x-1">
                                 <i className="fa-solid fa-trash"></i><span>{t('delete')}</span>
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               ))}
               {columnTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                     <i className="fa-solid fa-inbox text-2xl mb-2 text-gray-400 dark:text-gray-600"></i>
                     <p className="text-xs text-gray-500 dark:text-gray-400">{t('no_tasks_here')}</p>
                  </div>
               )}
            </div>
         </div>
      );
   };

   if (isLoading && taskList?.length === 0) return <PageLoader />;

   return (
      <div className="p-8 space-y-8">
         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('task_management')}</h1>
               <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span className="bg-dark-accent/10 dark:bg-dark-accent/20 text-dark-accent px-2 py-0.5 rounded capitalize">{role?.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>{taskList.length} {t('tasks_total')}</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                  <input
                     type="text"
                     placeholder={t('search_tasks_placeholder')}
                     className="bg-white dark:bg-dark-secondary border border-gray-300 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent w-64"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               {canManageTasks && (
                  <button onClick={handleOpenCreate} className="bg-dark-accent hover:bg-dark-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 shadow-lg shadow-dark-accent/10">
                     <i className="fa-solid fa-plus"></i><span>{t('new_task')}</span>
                  </button>
               )}
            </div>
         </div>

         {/* Stats */}
         <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
               { icon: 'fa-tasks', color: 'bg-blue-500', label: 'total', value: stats.total, sub: 'all_statuses_stat' },
               { icon: 'fa-spinner', color: 'bg-yellow-500', label: 'in_progress', value: stats.inProgress, sub: 'active_now' },
               { icon: 'fa-check-circle', color: 'bg-green-500', label: 'completed', value: stats.completed, sub: 'successful' },
               { icon: 'fa-check-circle', color: 'bg-green-500', label: 'completed', value: stats.completed, sub: 'successful' },
               { icon: 'fa-clock', color: 'bg-red-500', label: 'overdue', value: stats.overdue, sub: 'late' },
               { icon: 'fa-ban', color: 'bg-gray-500', label: 'cancelled', value: stats.cancelled, sub: 'stopped' }, // New stat
               { icon: 'fa-chart-line', color: 'bg-purple-500', label: 'success_rate', value: stats.avgCompletion, sub: 'efficiency' },
            ].map((stat, i) => (
               <div key={i} className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-700 transition group shadow-sm dark:shadow-none">
                  <div className="flex items-center gap-3 mb-2">
                     <div className={`w-8 h-8 ${stat.color} bg-opacity-20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <i className={`fa-solid ${stat.icon} ${stat.color.replace('bg-', 'text-')} text-sm`}></i>
                     </div>
                     <span className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">{t(stat.label)}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{stat.value}</div>
                  <div className="text-[10px] text-gray-500">{t(stat.sub)}</div>
               </div>
            ))}
         </div>

         {/* Filter Tabs */}
         <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-secondary p-1 rounded-xl w-fit border border-gray-200 dark:border-gray-800 overflow-x-auto">
            {['all', 'todo', 'in_progress', 'review', 'completed', 'overdue', 'cancelled'].map(f => (
               <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-dark-accent text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-dark-tertiary'}`}
               >
                  {f === 'all' ? t('all_tasks') : t(f)}
               </button>
            ))}
         </div>

         {/* Kanban Board */}
         <div className="flex justify-between gap-6 overflow-x-auto pb-4 custom-scrollbar">
            {renderColumn(t('todo'), 'todo', 'bg-gray-500')}
            {renderColumn(t('in_progress'), 'in_progress', 'bg-yellow-500')}
            {renderColumn(t('review'), 'review', 'bg-purple-500')}
            {renderColumn(t('completed'), 'completed', 'bg-green-500')}
            {renderColumn(t('overdue'), 'overdue', 'bg-red-500')}
            {renderColumn(t('cancelled'), 'cancelled', 'bg-gray-500')}
         </div>

         {/* Modal Overlay */}
         {/* View Task Modal */}
         {isViewModalOpen && currentTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}></div>
               <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-2xl p-8 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                           <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${currentTask.priority === 'urgent' ? 'bg-red-500 text-white' :
                              currentTask.priority === 'high' ? 'bg-orange-500 text-white' :
                                 currentTask.priority === 'medium' ? 'bg-yellow-500 text-black' :
                                    'bg-blue-500 text-white'
                              }`}>{t(currentTask.priority)}</span>
                           <span className="text-xs text-gray-400">#{currentTask._id?.slice(-6).toUpperCase()}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentTask.title}</h2>
                     </div>
                     <button onClick={() => setIsViewModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-tertiary text-gray-500 transition">
                        <i className="fa-solid fa-times text-lg"></i>
                     </button>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="md:col-span-2 space-y-6">
                        <section>
                           <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">{t('description')}</h3>
                           <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{currentTask.description || t('no_description')}</p>
                        </section>

                        <section className="bg-gray-50 dark:bg-dark-tertiary rounded-xl p-5 border border-gray-100 dark:border-gray-800">
                           <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">{t('project_info')}</h3>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <div className="text-[10px] text-gray-500 uppercase">{t('project_name')}</div>
                                 <div className="text-sm font-medium text-gray-900 dark:text-white">{currentTask.project?.title || currentTask.project?.name || t('unknown')}</div>
                              </div>
                              <div>
                                 <div className="text-[10px] text-gray-500 uppercase">{t('budget')}</div>
                                 <div className="text-sm font-medium text-green-600 dark:text-green-400">${currentTask.project?.budget || 0}</div>
                              </div>
                              <div className="col-span-2">
                                 <div className="text-[10px] text-gray-500 uppercase">{t('client')}</div>
                                 <div className="text-sm font-medium text-gray-900 dark:text-white">{currentTask.project?.client || t('unknown')}</div>
                              </div>
                           </div>
                        </section>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-4 shadow-sm bg-white dark:bg-dark-tertiary border border-gray-100 dark:border-gray-800 rounded-xl p-5">
                           <div>
                              <div className="text-[10px] text-gray-500 uppercase mb-1">{t('status')}</div>
                              <div className="flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${currentTask.status === 'completed' ? 'bg-green-500' :
                                    currentTask.status === 'in_progress' ? 'bg-yellow-500' :
                                       currentTask.status === 'review' ? 'bg-purple-500' :
                                          currentTask.status === 'overdue' ? 'bg-red-500' :
                                             currentTask.status === 'cancelled' ? 'bg-gray-500' : 'bg-gray-500'
                                    }`}></div>
                                 <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{t(currentTask.status)}</span>
                              </div>
                           </div>

                           <div>
                              <div className="text-[10px] text-gray-500 uppercase mb-2">{t('assignee')}</div>
                              <div className="flex items-center gap-3">
                                 <img
                                    src={currentTask.assignedTo?.avatar || `https://ui-avatars.com/api/?name=${currentTask.assignedTo?.name || 'U'}`}
                                    className="w-8 h-8 rounded-full border border-dark-accent"
                                    alt=""
                                 />
                                 <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{currentTask.assignedTo?.name || t('unassigned')}</div>
                                    <div className="text-[10px] text-gray-500">{currentTask.assignedTo?.position || currentTask.assignedTo?.role}</div>
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <div className="text-[10px] text-gray-500 uppercase mb-1">{t('deadline')}</div>
                                 <div className={`text-sm font-medium ${new Date(currentTask.deadline) < new Date() && currentTask.status !== 'completed' ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                    {currentTask.deadline ? new Date(currentTask.deadline).toLocaleDateString() : t('none')}
                                 </div>
                              </div>
                              <div>
                                 <div className="text-[10px] text-gray-500 uppercase mb-1">{t('weight')}</div>
                                 <div className="text-sm font-medium text-gray-900 dark:text-white">{currentTask.weight || 1}</div>
                              </div>
                           </div>

                           {/* Comments Section for Admin/Leads */}
                           {['super_admin', 'company_admin', 'team_lead'].includes(role) && (
                              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                 <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">{t('comments')} / {t('history')}</h4>
                                 <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                                    {currentTask.comments && currentTask.comments.length > 0 ? (
                                       currentTask.comments.map((comment, idx) => (
                                          <div key={idx} className="bg-gray-50 dark:bg-dark-secondary p-3 rounded-lg text-xs">
                                             <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-gray-800 dark:text-gray-200">{comment.user?.name || t('user')}</span>
                                                <span className="text-gray-400 text-[10px]">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                             </div>
                                             <p className="text-gray-600 dark:text-gray-400">{comment.text}</p>
                                          </div>
                                       ))
                                    ) : (
                                       <p className="text-xs text-gray-400 italic">{t('no_comments')}</p>
                                    )}
                                 </div>
                              </div>
                           )}
                        </div>

                        {canManageTasks && (
                           <div className="flex flex-col gap-2">
                              <button
                                 onClick={() => { setIsViewModalOpen(false); handleOpenEdit(currentTask); }}
                                 className="w-full py-2.5 bg-dark-accent/10 hover:bg-dark-accent/20 text-dark-accent rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                              >
                                 <i className="fa-solid fa-edit"></i>
                                 <span>{t('edit_task')}</span>
                              </button>
                              <button
                                 onClick={() => { setIsViewModalOpen(false); handleDeleteTask(currentTask); }}
                                 className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                              >
                                 <i className="fa-solid fa-trash"></i>
                                 <span>{t('delete_task')}</span>
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Edit/Create Modal */}
         {(isCreateModalOpen || isEditModalOpen) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}></div>
               <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-xl p-8 relative z-10 shadow-2xl">
                  <header className="flex items-center justify-between mb-6">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{isEditModalOpen ? t('edit_task') : t('create_new_task')}</h2>
                     <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition"><i className="fa-solid fa-times"></i></button>
                  </header>

                  <form onSubmit={async (e) => {
                     e.preventDefault();
                     try {
                        const finalData = { ...formData };
                        // Automatically set a deadline if it's missing (backend often requires it)
                        if (!finalData.deadline) {
                           const d = new Date();
                           d.setDate(d.getDate() + 14); // Default 14 days
                           finalData.deadline = d.toISOString().split('T')[0];
                        }

                        if (isEditModalOpen) {
                           const id = currentTask?._id || currentTask?.id;
                           await updateTask(id, finalData);
                           toast.success(t('task_updated'));
                        } else {
                           await createTask(finalData);
                           toast.success(t('task_created'));
                        }
                        setIsCreateModalOpen(false);
                        setIsEditModalOpen(false);
                     } catch (error) {
                        toast.error(error.message || 'Operation failed');
                     }
                  }} className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('title_label')}</label>
                           <input
                              type="text" required
                              className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                           />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('description_label')}</label>
                           <textarea
                              rows="3" required
                              className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent resize-none"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                           ></textarea>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('project')}</label>
                           <select
                              required
                              className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent appearance-none"
                              value={formData.project}
                              onChange={(e) => setFormData({ ...formData, project: e.target.value, assignedTo: '' })}
                           >
                              <option value="">{t('select_project')}</option>
                              {projectOptions.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.title}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('assignee')}</label>
                           <select
                              required
                              className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent appearance-none"
                              value={formData.assignedTo}
                              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                           >
                              <option value="">{t('select_member')}</option>
                              {userOptions.map(u => <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.role})</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('priority')}</label>
                           <select
                              className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent appearance-none"
                              value={formData.priority}
                              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                           >
                              <option value="low">{t('low')}</option>
                              <option value="medium">{t('medium')}</option>
                              <option value="high">{t('high')}</option>
                              <option value="urgent">{t('urgent')}</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('estimated_hours')}</label>
                           <input
                              type="number" min="0"
                              className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent"
                              value={formData.estimatedHours}
                              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                           />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('task_weight')}</label>
                           <input
                              type="number" min="1" max="10"
                              className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent"
                              value={formData.weight}
                              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                           />
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4">
                        <button
                           type="button"
                           onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                           className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-3 rounded-lg transition"
                        >
                           {t('cancel')}
                        </button>
                        <button
                           type="submit"
                           className="flex-1 bg-dark-accent hover:bg-red-600 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-dark-accent/20"
                        >
                           {isEditModalOpen ? t('update_task') : t('create_task')}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Cancel Modal */}
         {isCancelModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCancelModalOpen(false)}></div>
               <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-sm p-6 relative z-10 shadow-2xl">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('cancel_task')}</h3>
                  <form onSubmit={handleConfirmCancel}>
                     <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('reason_for_cancellation')}</label>
                        <textarea
                           required
                           className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent resize-none h-24"
                           placeholder={t('enter_reason')}
                           value={cancellationReason}
                           onChange={(e) => setCancellationReason(e.target.value)}
                        ></textarea>
                     </div>
                     <div className="flex gap-3">
                        <button
                           type="button"
                           onClick={() => setIsCancelModalOpen(false)}
                           className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-bold py-2 rounded-lg transition"
                        >
                           {t('back')}
                        </button>
                        <button
                           type="submit"
                           className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 rounded-lg transition"
                        >
                           {t('confirm_cancel')}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default Tasks;
