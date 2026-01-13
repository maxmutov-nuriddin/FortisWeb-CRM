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
      addTaskComment,
      getTasksByProjects,
      isLoading
   } = useTaskStore();

   const { projects, getAllProjects, getProjectsByCompany } = useProjectStore();
   const { users: companyUsers, getUsersByCompany, getAllUsers } = useUserStore();
   const { companies, getCompanies, getCompanyById, selectedCompany } = useCompanyStore();

   const [filter, setFilter] = useState('all');
   const [searchQuery, setSearchQuery] = useState('');
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [isViewModalOpen, setIsViewModalOpen] = useState(false);
   const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
   const [cancellationReason, setCancellationReason] = useState('');
   const [taskToCancel, setTaskToCancel] = useState(null);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [currentTask, setCurrentTask] = useState(null);
   const [richProjects, setRichProjects] = useState([]); // Store detailed project info for workers
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
   const canManageTasks = ['super_admin', 'company_admin', 'company_owner', 'team_lead'].includes(role);

   useEffect(() => {
      if (userId) {
         loadPageData();
      }
   }, [userId, role]);

   useEffect(() => {
      if (tasks && tasks.length > 0) {
         const now = new Date();
         tasks.forEach(task => {
            const isOverdue = new Date(task.deadline) < now;
            const isNotCompleted = task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'overdue';

            if (isOverdue && isNotCompleted) {
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
            const result = await getCompanies();
            const companyList = result?.data?.companies || result?.companies || result || [];
            const companyIds = companyList.map(c => c._id || c.id).filter(Boolean);

            if (companyIds.length > 0) {
               const results = await Promise.all([
                  getAllProjects(companyIds),
                  getAllUsers(companyIds)
               ]);

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
         } else if (role === 'company_admin' || role === 'company_owner' || role === 'team_lead') {
            if (companyId) {
               const [projResult, , companyResult] = await Promise.all([
                  getProjectsByCompany(companyId),
                  getUsersByCompany(companyId),
                  getCompanyById(companyId) // Load company data to get teams info
               ]);

               let projs = projResult?.data?.projects || projResult?.projects || (Array.isArray(projResult) ? projResult : []);

               if (role === 'team_lead') {
                  const currentUserId = String(userId);

                  console.log('=== TASKS - TEAM LEAD DEBUG ===');
                  console.log('Current User ID:', currentUserId);
                  console.log('Total Projects before filter:', projs.length);

                  // Get company data to access teams
                  // For team_lead, use the result from API call directly instead of store state which might be stale
                  const companyData = companyResult || selectedCompany?.data || selectedCompany;
                  const allTeams = companyData?.teams || [];

                  console.log('Selected Company:', companyData?.name);
                  console.log('All Teams:', allTeams.map(t => ({ id: t._id, name: t.name, teamLead: t.teamLead })));

                  projs = projs.filter(p => {
                     // Check direct teamLead field
                     const projectTeamLeadId = String(p.teamLead?._id || p.teamLead || '');
                     if (projectTeamLeadId === currentUserId) {
                        console.log('✓ Project matches (direct teamLead):', p.title);
                        return true;
                     }

                     // Check assignedTeam.teamLead (if populated)
                     const assignedTeamLeadId = String(p.assignedTeam?.teamLead?._id || p.assignedTeam?.teamLead || '');
                     if (assignedTeamLeadId === currentUserId) {
                        console.log('✓ Project matches (assignedTeam.teamLead):', p.title);
                        return true;
                     }

                     // Check assignedTeamId by looking up in company teams
                     const assignedTeamId = String(p.assignedTeam?._id || p.assignedTeam || p.assignedTeamId || '');
                     if (assignedTeamId) {
                        const team = allTeams.find(t => String(t._id || t.id) === assignedTeamId);
                        if (team) {
                           const teamLeadId = String(team.teamLead?._id || team.teamLead || '');
                           if (teamLeadId === currentUserId) {
                              console.log('✓ Project matches (assignedTeamId lookup):', p.title, 'Team:', team.name);
                              return true;
                           }
                        }
                     }

                     // Check if user is assigned member
                     const isAssignedMember = p.assignedMembers && p.assignedMembers.some(m => String(m.user?._id || m.user || m) === currentUserId);
                     if (isAssignedMember) {
                        console.log('✓ Project matches (assigned member):', p.title);
                     }
                     return isAssignedMember;
                  });

                  console.log('Filtered Projects for team lead:', projs.length);
               }

               const pIds = projs.map(p => p._id || p.id).filter(Boolean);
               console.log('Project IDs to fetch tasks for:', pIds);
               if (pIds.length > 0) {
                  await getTasksByProjects(pIds);
               } else {
                  useTaskStore.setState({ tasks: [] });
               }
            }
         } else {
            // For regular users (workers), fetch both their own tasks AND tasks from projects they are members of
            // This ensures they see unassigned tasks in their projects
            const userProjects = await getProjectsByCompany(companyId);
            const allProjects = userProjects?.data?.projects || userProjects?.projects || (Array.isArray(userProjects) ? userProjects : []) || [];

            // Filter projects where user is a member/assigned
            const myProjectIds = allProjects
               .filter(p => {
                  const currentUserId = String(userId);
                  // Check assignedMembers
                  const isMember = p.assignedMembers && p.assignedMembers.some(m => String(m.user?._id || m.user || m) === currentUserId);
                  // Check assignedTeam
                  // (For simplicity, if we don't have full team data here, we rely on assignedMembers for now, 
                  // or if backend filter worked. But to be safe for "Unassigned" visibility, we need to know if user is part of the project context)
                  return isMember;
               })
               .map(p => p._id || p.id)
               .filter(Boolean);

            if (myProjectIds.length > 0) {
               await getTasksByProjects(myProjectIds);

               // Fetch full project details for each project to ensure we have Client and Budget info
               // The getProjectsByCompany list might be "lite" for workers
               try {
                  const { getProjectById } = useProjectStore.getState();
                  const detailedProjects = await Promise.all(
                     myProjectIds.map(id => getProjectById(id).then(res => res?.data || res || null))
                  );
                  setRichProjects(detailedProjects.filter(Boolean));
               } catch (err) {
                  console.error('Failed to fetch detailed project info', err);
               }
            } else {
               // Fallback to just user's directly assigned tasks if no project membership found
               await getTasksByUser(userId);
            }
         }
      } catch (error) {
         console.error('Failed to load page data:', error);
      }
   };

   const taskList = useMemo(() => {
      let list = Array.isArray(tasks) ? tasks : tasks?.data?.tasks || tasks?.tasks || [];

      // Enrich tasks with project data from project store if missing
      // For workers, prioritize richProjects (fetched by ID) over general projects list
      const projectList = richProjects.length > 0
         ? richProjects
         : (Array.isArray(projects) ? projects : projects?.data?.projects || projects?.projects || []);

      if (list.length > 0 && projectList.length > 0) {
         list = list.map(task => {
            // If task already has a full project object with title AND client, keep it
            // checking client.name to be sure
            if (task.project && (task.project.title || task.project.name) && task.project.client?.name) {
               return task;
            }

            // Otherwise, try to find the project in the store
            const projectId = task.project?._id || task.project || task.projectId;
            if (projectId) {
               const foundProject = projectList.find(p => (p._id || p.id) === projectId);
               if (foundProject) {
                  return {
                     ...task,
                     project: foundProject
                  };
               }
            }
            return task;
         });
      }

      // Filter out tasks from completed projects globally so stats are correct
      return list.filter(t => t.project?.status !== 'completed');
   }, [tasks, projects, richProjects]);

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

      if (newStatus === 'overdue') {
         if (task && new Date(task.deadline) > new Date()) {
            toast.error(t('task_not_yet_overdue'));
         } else {
            toast.error(t('cannot_set_overdue_manually'));
         }
         return;
      }

      try {
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

      setIsSubmitting(true);
      try {
         const id = taskToCancel._id || taskToCancel.id;
         const timestamp = new Date().toLocaleString();
         await addTaskComment(id, { text: `${t('task_cancelled_reason')}: ${cancellationReason}` });
         await updateTaskStatus(id, { status: 'cancelled' });

         toast.success(t('task_cancelled_success'));
         setIsCancelModalOpen(false);
         setTaskToCancel(null);
      } catch (error) {
         toast.error(t('failed_cancel_task'));
      } finally {
         setIsSubmitting(false);
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

      // Filter out completed projects globally
      list = list.filter(p => p.status !== 'completed');

      if (role === 'team_lead') {
         const currentUserId = String(userId);

         // Get company data to access teams
         // For team_lead, use selectedCompany (loaded by getCompanyById)
         const companyData = selectedCompany?.data || selectedCompany;
         const allTeams = companyData?.teams || [];

         list = list.filter(p => {
            // Check direct teamLead field
            const projectTeamLeadId = String(p.teamLead?._id || p.teamLead || '');
            if (projectTeamLeadId === currentUserId) return true;

            // Check assignedTeam.teamLead (if populated)
            const assignedTeamLeadId = String(p.assignedTeam?.teamLead?._id || p.assignedTeam?.teamLead || '');
            if (assignedTeamLeadId === currentUserId) return true;

            // Check assignedTeamId by looking up in company teams
            const assignedTeamId = String(p.assignedTeam?._id || p.assignedTeam || p.assignedTeamId || '');
            if (assignedTeamId) {
               const team = allTeams.find(t => String(t._id || t.id) === assignedTeamId);
               if (team) {
                  const teamLeadId = String(team.teamLead?._id || team.teamLead || '');
                  if (teamLeadId === currentUserId) return true;
               }
            }

            // Check if user is assigned member
            const isAssignedMember = p.assignedMembers && p.assignedMembers.some(m => String(m.user?._id || m.user || m) === currentUserId);
            return isAssignedMember;
         });
      } else if (role !== 'super_admin' && role !== 'company_admin' && role !== 'company_owner') {
         const currentUserId = String(userId);
         list = list.filter(p =>
            (p.assignedMembers && p.assignedMembers.some(m => String(m.user?._id || m.user || m) === currentUserId))
         );
      }

      return list;
   }, [projects, role, userId, selectedCompany]);

   const userOptions = useMemo(() => {
      const rawUsers = Array.isArray(companyUsers) ? companyUsers : companyUsers?.data?.users || [];
      const allUsers = rawUsers.filter(u => u.role !== 'company_admin');
      if (!formData.project) return allUsers;

      const selectedProj = projectOptions.find(p => p._id === formData.project || p.id === formData.project);
      if (!selectedProj) return allUsers;

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

      memberIds = [...new Set(memberIds)];

      if (memberIds.length === 0) return allUsers;

      const filtered = allUsers.filter(u => {
         const uid = String(u._id || u.id);
         return memberIds.includes(uid);
      });

      if (filtered.length > 0) return filtered;

      return allUsers;
   }, [companyUsers, formData.project, projectOptions]);

   const renderColumn = (title, status, colorClass) => {
      const columnTasks = filteredTasks.filter(t => t.status === status);
      const isOverdueCol = status === 'overdue';

      return (
         <div
            className="flex-shrink-0 w-80 lg:w-96 flex flex-col h-[calc(100vh-280px)] bg-gray-100/50 dark:bg-zinc-900/40 rounded-3xl p-4 border border-gray-200/50 dark:border-zinc-800/50 backdrop-blur-sm"
            onDragOver={!isOverdueCol ? onDragOver : undefined}
            onDrop={!isOverdueCol ? (e) => onDrop(e, status) : undefined}
         >
            <div className={`flex items-center justify-between mb-4 px-2`}>
               <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shadow-sm ring-2 ring-opacity-20 ${colorClass.replace('bg-', 'ring-')} ${colorClass}`}></div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{title}</h3>
               </div>
               <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-full shadow-sm">
                  {columnTasks.length}
               </span>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar pb-2">
               {columnTasks.map(task => (
                  <div
                     key={task._id}
                     draggable
                     onDragStart={(e) => onDragStart(e, task)}
                     onDragEnd={onDragEnd}
                     onClick={() => handleTaskClick(task)}
                     className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-lg hover:border-red-500/20 dark:hover:border-red-500/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                  >
                     <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-transparent to-transparent group-hover:from-red-500/50 group-hover:to-transparent transition-all duration-500"></div>

                     <div className="flex items-start justify-between mb-3 gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${task.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' :
                           task.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30' :
                              task.priority === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30' :
                                 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30'
                           }`}>
                           {t(task.priority)}
                        </span>
                        {task.weight && task.weight >= 1 && (
                           <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                              <i className="fa-solid fa-scale-balanced"></i> {task.weight}
                           </span>
                        )}
                     </div>

                     <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-2 line-clamp-2 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                        {task.title}
                     </h4>

                     <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                        {task.description}
                     </p>

                     <div className="flex items-center justify-between border-t border-gray-100 dark:border-zinc-800 pt-3 mt-auto">
                        <div className="flex items-center gap-2">
                           {task.assignedTo?.avatar ? (
                              <img src={task.assignedTo.avatar} alt="" className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-zinc-900 object-cover" />
                           ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-800 to-black text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white dark:ring-zinc-900">
                                 {task.assignedTo?.name?.[0] || '?'}
                              </div>
                           )}
                           <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate max-w-[80px]">
                              {task.assignedTo?.name?.split(' ')[0] || t('unassigned') || 'Unassigned'}
                           </span>
                        </div>

                        <div className={`text-[10px] font-medium flex items-center gap-1.5 ${new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'text-red-500 bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded-full' : 'text-gray-400'
                           }`}>
                           <i className="fa-regular fa-calendar"></i>
                           <span>{task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : t('no_date')}</span>
                        </div>
                     </div>

                     {/* Premium Hover Actions */}
                     <div className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 z-10 p-4">
                        <div className="flex items-center gap-2">
                           {canManageTasks && (
                              <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }} className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white hover:bg-red-500 hover:text-white shadow-lg flex items-center justify-center transition-all duration-200">
                                 <i className="fa-solid fa-pen text-xs"></i>
                              </button>
                           )}
                           {status !== 'completed' && (
                              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task._id, 'completed'); }} className="w-9 h-9 rounded-xl bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30 flex items-center justify-center transition-all duration-200">
                                 <i className="fa-solid fa-check text-xs"></i>
                              </button>
                           )}
                           {canManageTasks && (
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }} className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 text-red-500 hover:bg-red-500 hover:text-white shadow-lg flex items-center justify-center transition-all duration-200">
                                 <i className="fa-solid fa-trash text-xs"></i>
                              </button>
                           )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">{t('quick_actions')}</span>
                     </div>
                  </div>
               ))}

               {columnTasks.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl opacity-50">
                     <i className="fa-solid fa-inbox text-2xl text-gray-300 dark:text-zinc-700 mb-2"></i>
                     <p className="text-xs font-medium text-gray-400 dark:text-zinc-600">{t('no_tasks')}</p>
                  </div>
               )}
            </div>
         </div>
      );
   };

   if (isLoading && taskList?.length === 0) return <PageLoader />;

   return (
      <div className="min-h-screen p-6 lg:p-10 bg-gray-50 dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-red-500/30">
         {/* Top Header */}
         <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                     {t('task_management')}
                  </h1>
                  <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider border border-red-200 dark:border-red-900/30">
                     {role?.replace('_', ' ')}
                  </span>
               </div>
               <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {t('manage_projects_and_tasks')} <span className="text-gray-300 dark:text-zinc-700 mx-2">|</span> <span className="text-gray-900 dark:text-white font-bold">{taskList.length}</span> {t('active_tasks')}
               </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
               <div className="relative group">
                  <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors"></i>
                  <input
                     type="text"
                     placeholder={t('search_tasks')}
                     className="w-full sm:w-80 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-300"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               {canManageTasks && (
                  <button
                     onClick={handleOpenCreate}
                     className="bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                     <i className="fa-solid fa-plus text-sm"></i>
                     <span>{t('create_new_task')}</span>
                  </button>
               )}
            </div>
         </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            {[
               { icon: 'fa-layer-group', color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'total_tasks', value: stats.total },
               { icon: 'fa-spinner', color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'in_progress', value: stats.inProgress },
               { icon: 'fa-check-circle', color: 'text-green-500', bg: 'bg-green-500/10', label: 'completed', value: stats.completed },
               { icon: 'fa-circle-exclamation', color: 'text-red-500', bg: 'bg-red-500/10', label: 'overdue', value: stats.overdue },
               { icon: 'fa-chart-pie', color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'efficiency', value: stats.avgCompletion },
            ].map((stat, i) => (
               <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                     <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center text-xl shadow-inner`}>
                        <i className={`fa-solid ${stat.icon}`}></i>
                     </div>
                     <div className="text-right">
                        <span className="block text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</span>
                     </div>
                  </div>
                  <div className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t(stat.label)}</div>
               </div>
            ))}
         </div>

         {/* Filter Tabs */}
         <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'todo', 'in_progress', 'review', 'completed', 'overdue', 'cancelled'].map(f => (
               <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${filter === f
                     ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg shadow-gray-900/20'
                     : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800'
                     }`}
               >
                  {f === 'all' ? t('all_tasks') : t(f)}
               </button>
            ))}
         </div>

         {/* Kanban Board */}
         <div className="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
            {renderColumn(t('todo'), 'todo', 'bg-gray-500')}
            {renderColumn(t('in_progress'), 'in_progress', 'bg-yellow-500')}
            {renderColumn(t('review'), 'review', 'bg-purple-500')}
            {renderColumn(t('completed'), 'completed', 'bg-green-500')}
            {renderColumn(t('overdue'), 'overdue', 'bg-red-500')}
            {renderColumn(t('cancelled'), 'cancelled', 'bg-gray-500')}
         </div>

         {/* View Modal */}
         {isViewModalOpen && currentTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setIsViewModalOpen(false)}></div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl w-full max-w-4xl p-0 relative z-10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 flex items-start justify-between bg-gray-50/50 dark:bg-zinc-900/50">
                     <div className="flex-1 pr-8">
                        <div className="flex items-center gap-3 mb-3">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${currentTask.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400' :
                              currentTask.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400' :
                                 currentTask.priority === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                    'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400'
                              }`}>
                              {t(currentTask.priority)}
                           </span>
                           <span className="text-xs font-mono text-gray-400">ID: {currentTask._id?.slice(-6).toUpperCase()}</span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{currentTask.title}</h2>
                     </div>
                     <button onClick={() => setIsViewModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                        <i className="fa-solid fa-times text-lg"></i>
                     </button>
                  </div>

                  {/* Modal Body */}
                  <div className="overflow-y-auto custom-scrollbar p-8 bg-white dark:bg-zinc-900 flex-1">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                           <div>
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('description')}</h3>
                              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800/50">
                                 {currentTask.description || t('no_description')}
                              </div>
                           </div>

                           <div className="bg-gradient-to-br from-gray-900 to-black dark:from-zinc-800 dark:to-zinc-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-red-600 rounded-full opacity-20 blur-3xl"></div>
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                                 <i className="fa-solid fa-diagram-project"></i> {t('project_details')}
                              </h3>

                              <div className="grid grid-cols-2 gap-8 relative z-10">
                                 <div className="col-span-2">
                                    <div className="text-xs text-gray-400 uppercase mb-1">{t('project_name')}</div>
                                    <div className="text-xl font-bold truncate">
                                       {currentTask.project?.title || currentTask.project?.name || t('unknown_project')}
                                    </div>
                                 </div>
                                 <div>
                                    <div className="text-xs text-gray-400 uppercase mb-1">{t('client')}</div>
                                    <div className="font-semibold">{currentTask.project?.client?.name || t('unknown')}</div>
                                 </div>
                                 <div>
                                    <div className="text-xs text-gray-400 uppercase mb-1">{t('budget')}</div>
                                    <div className="font-mono text-green-400 font-bold">
                                       {currentTask.project?.budget ? `$${currentTask.project.budget.toLocaleString()}` : 'N/A'}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                           <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800">
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('properties')}</h3>

                              <div className="space-y-4">
                                 <div>
                                    <div className="text-[10px] text-gray-400 uppercase mb-1">{t('status')}</div>
                                    <div className="flex items-center gap-2">
                                       <div className={`w-2.5 h-2.5 rounded-full ${currentTask.status === 'completed' ? 'bg-green-500' :
                                          currentTask.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-400'
                                          }`}></div>
                                       <span className="font-bold text-gray-900 dark:text-white capitalize">{t(currentTask.status)}</span>
                                    </div>
                                 </div>

                                 <div>
                                    <div className="text-[10px] text-gray-400 uppercase mb-1">{t('assignee')}</div>
                                    <div className="flex items-center gap-3">
                                       <img src={currentTask.assignedTo?.avatar || `https://ui-avatars.com/api/?name=${currentTask.assignedTo?.name || 'U'}`} className="w-8 h-8 rounded-full" alt="" />
                                       <div>
                                          <div className="text-sm font-bold text-gray-900 dark:text-white">{currentTask.assignedTo?.name || t('unassigned') || 'Unassigned'}</div>
                                          <div className="text-[10px] text-gray-500">{currentTask.assignedTo?.role}</div>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                       <div className="text-[10px] text-gray-400 uppercase mb-1">{t('deadline')}</div>
                                       <div className={`font-bold text-sm ${new Date(currentTask.deadline) < new Date() ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                          {currentTask.deadline ? new Date(currentTask.deadline).toLocaleDateString() : 'N/A'}
                                       </div>
                                    </div>
                                    <div>
                                       <div className="text-[10px] text-gray-400 uppercase mb-1">{t('weight')}</div>
                                       <div className="font-bold text-sm text-gray-900 dark:text-white">{currentTask.weight}</div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {canManageTasks && (
                              <div className="grid grid-cols-2 gap-3">
                                 <button onClick={() => { setIsViewModalOpen(false); handleOpenEdit(currentTask); }} className="py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-sm text-gray-900 dark:text-white hover:border-blue-500 hover:text-blue-500 transition-colors">
                                    {t('edit')}
                                 </button>
                                 <button onClick={() => { setIsViewModalOpen(false); handleDeleteTask(currentTask); }} className="py-3 bg-red-50 dark:bg-red-900/10 border border-transparent rounded-xl font-bold text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                    {t('delete')}
                                 </button>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Create/Edit Modal */}
         {(isCreateModalOpen || isEditModalOpen) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}></div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl w-full max-w-2xl p-8 relative z-10 shadow-2xl">
                  <header className="flex items-center justify-between mb-8">
                     <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                        {isEditModalOpen ? t('edit_task') : t('create_new_task')}
                     </h2>
                     <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700 transition">
                        <i className="fa-solid fa-times"></i>
                     </button>
                  </header>

                  <form onSubmit={async (e) => {
                     e.preventDefault();
                     if (isSubmitting) return;
                     setIsSubmitting(true);
                     try {
                        const finalData = { ...formData };
                        // Ensure numeric fields are numbers
                        finalData.weight = parseInt(finalData.weight) || 1;
                        finalData.estimatedHours = parseInt(finalData.estimatedHours) || 0;
                        if (!finalData.deadline) {
                           const d = new Date();
                           d.setDate(d.getDate() + 14);
                           finalData.deadline = d.toISOString().split('T')[0];
                        }
                        if (isEditModalOpen) {
                           await updateTask(currentTask?._id || currentTask?.id, finalData);
                           toast.success(t('task_updated'));
                           loadPageData();
                        } else {
                           const created = await createTask(finalData);
                           // FIX: Backend might ignore weight on create, so update it if needed
                           if (created && Number(created.weight) !== finalData.weight && finalData.weight !== 1) {
                              await updateTask(created._id || created.id, { weight: finalData.weight });
                           }
                           toast.success(t('task_created'));
                           loadPageData();
                        }
                        setIsCreateModalOpen(false);
                        setIsEditModalOpen(false);
                     } catch (error) {
                        toast.error(error.message || 'Operation failed');
                     } finally {
                        setIsSubmitting(false);
                     }
                  }} className="space-y-6">
                     <div className="space-y-5">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('title')}</label>
                           <input
                              type="text" required
                              className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('project')}</label>
                              <select
                                 required
                                 className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                                 value={formData.project}
                                 onChange={(e) => setFormData({ ...formData, project: e.target.value, assignedTo: '' })}
                              >
                                 <option value="">{t('select_project')}</option>
                                 {projectOptions.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.title}</option>)}
                              </select>
                              {formData.project && (
                                 <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    {(() => {
                                       const selectedProj = projectOptions.find(p => (p._id || p.id) === formData.project);
                                       if (selectedProj?.team?.name) {
                                          return (
                                             <span className="flex items-center gap-1.5">
                                                <i className="fa-solid fa-users text-red-500"></i>
                                                Team: <strong className="text-gray-900 dark:text-white">{selectedProj.team.name}</strong>
                                             </span>
                                          );
                                       }
                                       return null;
                                    })()}
                                 </div>
                              )}
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('assignee')}</label>
                              <select
                                 className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                                 value={formData.assignedTo}
                                 onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                              >
                                 <option value="">{t('unassigned') || 'Unassigned'}</option>
                                 {userOptions.map(u => (
                                    <option key={u._id || u.id} value={u._id || u.id}>
                                       {u.name} {u.role ? `(${u.role.replace('_', ' ')})` : ''}
                                    </option>
                                 ))}
                              </select>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-5">
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('priority')}</label>
                              <select
                                 className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 font-medium text-gray-900 dark:text-white outline-none"
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
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('hours')}</label>
                              <input
                                 type="number" min="0"
                                 className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 font-medium text-gray-900 dark:text-white outline-none"
                                 value={formData.estimatedHours}
                                 onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('weight')}</label>
                              <input
                                 type="number" min="1" max="10"
                                 className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 font-medium text-gray-900 dark:text-white outline-none"
                                 value={formData.weight}
                                 onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
                              />
                           </div>
                        </div>

                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('description')}</label>
                           <textarea
                              rows="4" required
                              className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none resize-none"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                           ></textarea>
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <button
                           type="button"
                           onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                           className="flex-1 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-bold py-4 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
                        >
                           {t('cancel')}
                        </button>
                        <button
                           type="submit"
                           className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
                           disabled={isSubmitting}
                        >
                           {isSubmitting && <i className="fa-solid fa-spinner fa-spin"></i>}
                           {isEditModalOpen ? t('save_changes') : t('create_task')}
                        </button>
                     </div>
                  </form>
               </div>
            </div >
         )}

         {/* Cancel Task Modal - Kept Simple */}
         {
            isCancelModalOpen && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCancelModalOpen(false)}></div>
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 relative z-10 shadow-2xl">
                     <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('confirm_cancellation')}</h3>
                     <form onSubmit={handleConfirmCancel}>
                        <textarea
                           required
                           className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 mb-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 outline-none"
                           placeholder={t('reason_placeholder')}
                           value={cancellationReason}
                           onChange={(e) => setCancellationReason(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end gap-3">
                           <button type="button" onClick={() => setIsCancelModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition">{t('back')}</button>
                           <button type="submit" className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition">{t('confirm_cancel')}</button>
                        </div>
                     </form>
                  </div>
               </div>
            )
         }
      </div >
   );
};

export default Tasks;
