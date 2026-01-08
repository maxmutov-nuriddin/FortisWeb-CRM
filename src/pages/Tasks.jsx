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
      getTasksByProjects,
      isLoading
   } = useTaskStore();

   const { projects, getAllProjects, getProjectsByCompany } = useProjectStore();
   const { users: companyUsers, getUsersByCompany, getAllUsers } = useUserStore();
   const { companies, getCompanies } = useCompanyStore();

   const [filter, setFilter] = useState(t('all_tasks'));
   const [searchQuery, setSearchQuery] = useState('');
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

   useEffect(() => {
      if (userId) {
         fetchTasks();
         fetchFormData();
      }
   }, [userId, role]);

   const fetchTasks = async () => {
      try {
         if (role === 'super_admin') {
            // Handled in fetchFormData to avoid multiple project fetches
         } else if (role === 'company_admin' || role === 'team_lead') {
            if (companyId) {
               const projResult = await getProjectsByCompany(companyId);
               let projs = projResult?.data?.projects || projResult || [];

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
                  // If no projects found or allowed, clear tasks
                  useTaskStore.setState({ tasks: [] });
               }
            }
         } else {
            await getTasksByUser(userId);
         }
      } catch (error) {
         console.error('Failed to fetch tasks:', error);
      }
   };

   const fetchFormData = async () => {
      try {
         if (role === 'super_admin') {
            console.log('Fetching data for Super Admin...');
            // 1. Get all companies
            const result = await getCompanies();
            const companyList = result?.data?.companies || result?.companies || result || [];
            const companyIds = companyList.map(c => c._id || c.id).filter(Boolean);
            console.log(`Found ${companyIds.length} companies:`, companyIds);

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
               console.log(`Found ${projectIds.length} projects for harvesting tasks.`);

               if (projectIds.length > 0) {
                  await getTasksByProjects(projectIds);
               } else {
                  console.warn('No projects found to harvest tasks from.');
                  useTaskStore.setState({ tasks: [] });
               }
            } else {
               console.warn('No companies found.');
               useTaskStore.setState({ tasks: [] });
            }
         } else if (role === 'company_admin' || role === 'team_lead') {
            if (companyId) {
               const projResult = await getProjectsByCompany(companyId);
               await getUsersByCompany(companyId);

               // Fetch tasks only for allowed projects
               let projs = projResult?.data?.projects || projResult?.projects || (Array.isArray(projResult) ? projResult : []);

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
         }
      } catch (error) {
         console.error('Error in fetchFormData:', error);
      }
   };

   const taskList = useMemo(() => {
      const list = Array.isArray(tasks) ? tasks : tasks?.data?.tasks || tasks?.tasks || [];
      return list;
   }, [tasks]);

   const filteredTasks = useMemo(() => {
      let result = taskList;

      if (filter !== t('all_tasks')) {
         const statusMap = {
            [t('todo')]: 'todo',
            [t('in_progress')]: 'in_progress',
            [t('review')]: 'review',
            [t('completed')]: 'completed'
         };
         result = result.filter(t => t.status === statusMap[filter]);
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
      const overdue = taskList.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length;
      const avgCompletion = taskList.length > 0 ? (completed / total * 100).toFixed(1) + '%' : '0%';

      return { total, inProgress, completed, overdue, avgCompletion };
   }, [taskList]);

   const handleStatusChange = async (taskId, newStatus) => {
      const id = taskId?._id || taskId?.id || taskId;
      try {
         await updateTaskStatus(id, newStatus);
         toast.success(t('status_updated_to', { status: newStatus.replace('_', ' ') }));
      } catch (error) {
         toast.error('Failed to update status');
      }
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



   const canManageTasks = ['super_admin', 'company_admin', 'team_lead'].includes(role);

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
      return (
         <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 flex flex-col h-[calc(100vh-280px)] min-w-[300px]">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-dark-secondary pb-2 z-10">
               <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${colorClass}`}></div><span>{t(title.toLowerCase().replace(' ', '_'))}</span>
               </h3>
               <span className="text-sm text-gray-400 bg-dark-tertiary px-2 py-1 rounded">{columnTasks.length}</span>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
               {columnTasks.map(task => (
                  <div key={task._id} className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer relative group">
                     <div className="flex items-start justify-between mb-2 gap-2">
                        <h4 className="text-sm font-medium text-white line-clamp-2">{task.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${task.priority === 'urgent' ? 'bg-red-500 text-white' :
                           task.priority === 'high' ? 'bg-orange-500 text-white' :
                              task.priority === 'medium' ? 'bg-yellow-500 text-black' :
                                 'bg-blue-500 text-white'
                           }`}>{task.priority}</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3 line-clamp-2">{task.description}</p>

                     <div className="flex items-center space-x-2 mb-3">
                        <span className="text-[10px] bg-dark-secondary text-gray-300 px-2 py-0.5 rounded border border-gray-700">
                           {task.project?.title || t('no_project')}
                        </span>
                        {task.weight > 1 && (
                           <span className="text-[10px] bg-purple-500 bg-opacity-20 text-purple-400 px-2 py-0.5 rounded">
                              {t('weight')}: {task.weight}
                           </span>
                        )}
                     </div>

                     <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center space-x-2">
                           <div className="w-6 h-6 rounded-full bg-dark-accent flex items-center justify-center text-[10px] text-white font-bold">
                              {task.assignedTo?.name?.[0] || 'U'}
                           </div>
                           <span className="text-[11px] text-gray-400 truncate max-w-[80px]">{task.assignedTo?.name || t('unassigned')}</span>
                        </div>
                        <span className={`text-[10px] flex items-center space-x-1 ${new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'text-red-500' : 'text-gray-500'}`}>
                           <i className="fa-regular fa-calendar text-[9px]"></i>
                           <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : t('no_deadline')}</span>
                        </span>
                     </div>

                     {/* Action Overlay */}
                     <div className="absolute inset-0 bg-dark-tertiary bg-opacity-95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center p-4">
                        <div className="flex flex-wrap gap-2 justify-center mb-4">
                           {status !== 'todo' && <button onClick={() => handleStatusChange(task._id, 'todo')} className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs flex items-center justify-center" title={t('move_to_todo')}><i className="fa-solid fa-arrow-left"></i></button>}
                           {status !== 'in_progress' && <button onClick={() => handleStatusChange(task._id, 'in_progress')} className="w-8 h-8 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-xs flex items-center justify-center" title={t('start_process')}><i className="fa-solid fa-play"></i></button>}
                           {status !== 'review' && <button onClick={() => handleStatusChange(task._id, 'review')} className="w-8 h-8 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center justify-center" title={t('send_to_review')}><i className="fa-solid fa-eye"></i></button>}
                           {status !== 'completed' && <button onClick={() => handleStatusChange(task._id, 'completed')} className="w-8 h-8 rounded bg-green-600 hover:bg-green-500 text-white text-xs flex items-center justify-center" title={t('complete')}><i className="fa-solid fa-check"></i></button>}
                        </div>
                        {canManageTasks && (
                           <div className="flex border-t border-gray-700 pt-3 gap-3 justify-center">
                              <button onClick={() => handleOpenEdit(task)} className="text-blue-400 hover:text-blue-300 text-xs flex items-center space-x-1">
                                 <i className="fa-solid fa-edit"></i><span>Edit</span>
                              </button>
                              <button onClick={() => handleDeleteTask(task._id)} className="text-red-400 hover:text-red-300 text-xs flex items-center space-x-1">
                                 <i className="fa-solid fa-trash"></i><span>Delete</span>
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               ))}
               {columnTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-50">
                     <i className="fa-solid fa-inbox text-2xl mb-2"></i>
                     <p className="text-xs">{t('no_tasks_here')}</p>
                  </div>
               )}
            </div>
         </div>
      );
   };

   if (isLoading && taskList.length === 0) return <PageLoader />;

   return (
      <div className="p-8 space-y-8 animate-fadeIn">
         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-3xl font-bold text-white mb-2">{t('task_management')}</h1>
               <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span className="bg-dark-accent/20 text-dark-accent px-2 py-0.5 rounded capitalize">{role?.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>{taskList.length} tasks total</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative">
                  <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                  <input
                     type="text"
                     placeholder="Search tasks..."
                     className="bg-dark-secondary border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-64"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               {canManageTasks && (
                  <button onClick={handleOpenCreate} className="bg-dark-accent hover:bg-dark-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 shadow-lg shadow-dark-accent/10">
                     <i className="fa-solid fa-plus"></i><span>New Task</span>
                  </button>
               )}
            </div>
         </div>

         {/* Stats */}
         <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
               { icon: 'fa-tasks', color: 'bg-blue-500', label: 'Total', value: stats.total, sub: 'All statuses' },
               { icon: 'fa-spinner', color: 'bg-yellow-500', label: 'In Progress', value: stats.inProgress, sub: 'Active now' },
               { icon: 'fa-check-circle', color: 'bg-green-500', label: 'Completed', value: stats.completed, sub: 'Successful' },
               { icon: 'fa-calendar-xmark', color: 'bg-red-500', label: 'Overdue', value: stats.overdue, sub: 'Needs attention' },
               { icon: 'fa-chart-line', color: 'bg-purple-500', label: 'Success Rate', value: stats.avgCompletion, sub: 'Efficiency' },
            ].map((stat, i) => (
               <div key={i} className="bg-dark-secondary border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition group">
                  <div className="flex items-center gap-3 mb-2">
                     <div className={`w-8 h-8 ${stat.color} bg-opacity-20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <i className={`fa-solid ${stat.icon} ${stat.color.replace('bg-', 'text-')} text-sm`}></i>
                     </div>
                     <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
                  <div className="text-[10px] text-gray-500">{stat.sub}</div>
               </div>
            ))}
         </div>

         {/* Filter Tabs */}
         <div className="flex items-center gap-2 bg-dark-secondary p-1 rounded-xl w-fit border border-gray-800">
            {['All Tasks', 'To Do', 'In Progress', 'Review', 'Completed'].map(f => (
               <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-dark-accent text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-dark-tertiary'}`}
               >
                  {f}
               </button>
            ))}
         </div>

         {/* Kanban Board */}
         <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
            {renderColumn('To Do', 'todo', 'bg-gray-500')}
            {renderColumn('In Progress', 'in_progress', 'bg-yellow-500')}
            {renderColumn('Review', 'review', 'bg-purple-500')}
            {renderColumn('Completed', 'completed', 'bg-green-500')}
         </div>

         {/* Modal Overlay */}
         {(isCreateModalOpen || isEditModalOpen) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}></div>
               <div className="bg-dark-secondary border border-gray-700 rounded-2xl w-full max-w-xl p-8 relative z-10 shadow-2xl animate-modalEnter">
                  <header className="flex items-center justify-between mb-6">
                     <h2 className="text-2xl font-bold text-white">{isEditModalOpen ? 'Edit Task' : 'Create New Task'}</h2>
                     <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="text-gray-500 hover:text-white transition"><i className="fa-solid fa-times"></i></button>
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
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-dark-accent"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                           />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('description_label')}</label>
                           <textarea
                              rows="3" required
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-dark-accent resize-none"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                           ></textarea>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('project')}</label>
                           <select
                              required
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-dark-accent appearance-none"
                              value={formData.project}
                              onChange={(e) => setFormData({ ...formData, project: e.target.value, assignedTo: '' })}
                           >
                              <option value="">Select Project</option>
                              {projectOptions.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.title}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('assignee')}</label>
                           <select
                              required
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-dark-accent appearance-none"
                              value={formData.assignedTo}
                              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                           >
                              <option value="">Select Member</option>
                              {userOptions.map(u => <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.role})</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('priority')}</label>
                           <select
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-dark-accent appearance-none"
                              value={formData.priority}
                              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                           >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('estimated_hours')}</label>
                           <input
                              type="number" min="0"
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-dark-accent"
                              value={formData.estimatedHours}
                              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                           />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('task_weight')}</label>
                           <input
                              type="number" min="1" max="10"
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-dark-accent"
                              value={formData.weight}
                              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                           />
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4">
                        <button
                           type="button"
                           onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                           className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           className="flex-1 bg-dark-accent hover:bg-red-600 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-dark-accent/20"
                        >
                           {isEditModalOpen ? 'Update Task' : 'Create Task'}
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
