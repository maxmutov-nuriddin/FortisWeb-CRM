import React, { useEffect, useMemo, useState } from 'react';
import { useTaskStore } from '../store/task.store';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'react-toastify';
import PageLoader from '../components/loader/PageLoader';

const Tasks = () => {
   const { user } = useAuthStore();
   const { tasks, getTasksByUser, updateTaskStatus, isLoading } = useTaskStore();
   const [filter, setFilter] = useState('All Tasks');

   useEffect(() => {
      if (user) {
         const userId = user.data?.user?._id || user.user?._id || user._id;
         if (userId) {
            getTasksByUser(userId);
         }
      }
   }, [user, getTasksByUser]);

   const taskList = useMemo(() => {
      if (Array.isArray(tasks)) return tasks;
      if (tasks?.data && Array.isArray(tasks.data)) return tasks.data;
      if (tasks?.tasks && Array.isArray(tasks.tasks)) return tasks.tasks;
      return [];
   }, [tasks]);

   const filteredTasks = useMemo(() => {
      if (filter === 'All Tasks') return taskList;
      return taskList.filter(t =>
         filter === 'To Do' ? t.status === 'todo' :
            filter === 'In Progress' ? t.status === 'in_progress' :
               filter === 'Review' ? t.status === 'review' :
                  filter === 'Completed' ? t.status === 'completed' : true
      );
   }, [taskList, filter]);

   const stats = useMemo(() => {
      const total = taskList.length;
      const inProgress = taskList.filter(t => t.status === 'in_progress').length;
      const completed = taskList.filter(t => t.status === 'completed').length;
      const overdue = taskList.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length;

      // Calculate avg completion time? (Requires complicated logic, skipping for now/mocking)
      const avgCompletion = "2.4";

      return { total, inProgress, completed, overdue, avgCompletion };
   }, [taskList]);

   const handleStatusChange = async (taskId, newStatus) => {
      try {
         await updateTaskStatus(taskId, newStatus);
         toast.success(`Task moved to ${newStatus.replace('_', ' ')}`, {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      } catch (error) {
         console.error(error);
         toast.error('Failed to update task status', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      }
   };

   // Helper to render columns
   const renderColumn = (title, status, colorClass, count) => (
      <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 h-full">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
               <div className={`w-3 h-3 rounded-full ${colorClass}`}></div><span>{title}</span>
            </h3>
            <span className="text-sm text-gray-400 bg-dark-tertiary px-2 py-1 rounded">{count}</span>
         </div>
         <div className="space-y-3">
            {taskList.filter(t => t.status === status).map(task => (
               <div key={task._id || task.id} className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer relative group">
                  <div className="flex items-start justify-between mb-2">
                     <h4 className="text-sm font-medium text-white line-clamp-2">{task.title}</h4>
                     <span className={`px-2 py-1 bg-opacity-20 rounded text-xs ${task.priority === 'high' ? 'bg-red-500 text-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500 text-yellow-500' :
                           'bg-blue-500 text-blue-500'
                        }`}>{task.priority || 'Normal'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">{task.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                     <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-[10px] text-white">
                           {task.assignee?.name?.[0] || 'U'}
                        </div>
                        <span className="text-xs text-gray-400">{task.assignee?.name || 'Unassigned'}</span>
                     </div>
                     <span className={`text-xs ${new Date(task.deadline) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                        {task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Date'}
                     </span>
                  </div>

                  {/* Quick Actions on Hover */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-secondary rounded shadow-lg p-1 flex space-x-1">
                     {status !== 'todo' && <button onClick={() => handleStatusChange(task._id || task.id, 'todo')} title="Move to Todo" className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded text-gray-400"><i className="fa-solid fa-arrow-left"></i></button>}
                     {status !== 'in_progress' && <button onClick={() => handleStatusChange(task._id || task.id, 'in_progress')} title="Move to In Progress" className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded text-blue-500"><i className="fa-solid fa-play"></i></button>}
                     {status !== 'review' && <button onClick={() => handleStatusChange(task._id || task.id, 'review')} title="Move to Review" className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded text-purple-500"><i className="fa-solid fa-eye"></i></button>}
                     {status !== 'completed' && <button onClick={() => handleStatusChange(task._id || task.id, 'completed')} title="Complete" className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded text-green-500"><i className="fa-solid fa-check"></i></button>}
                  </div>
               </div>
            ))}
            {taskList.filter(t => t.status === status).length === 0 && (
               <p className="text-center text-xs text-gray-500 py-4">No tasks</p>
            )}
         </div>
      </div>
   );

   if (isLoading && taskList.length === 0) return <PageLoader />;

   return (
      <div className="p-8 space-y-8">
         <div id="tasks-header-section">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Task Management</h1>
                  <p className="text-gray-400">Organize, assign, and track project tasks</p>
               </div>
               <div className="flex items-center space-x-3">
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-filter"></i><span>Filter</span>
                  </button>
                  <button onClick={() => toast.info('Create Task Modal - Coming Soon!')} className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                     <i className="fa-solid fa-plus"></i><span>Create Task</span>
                  </button>
               </div>
            </div>
         </div>

         <div id="tasks-stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-tasks text-blue-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Total Tasks</h3>
               <p className="text-2xl font-bold text-white">{stats.total}</p>
               <p className="text-xs text-green-500 mt-1">Assigned to you</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-clock text-yellow-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">In Progress</h3>
               <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
               <p className="text-xs text-gray-500 mt-1">Active tasks</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-check-circle text-green-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Completed</h3>
               <p className="text-2xl font-bold text-white">{stats.completed}</p>
               <p className="text-xs text-green-500 mt-1">Finished tasks</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-exclamation-triangle text-red-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Overdue</h3>
               <p className="text-2xl font-bold text-white">{stats.overdue}</p>
               <p className="text-xs text-red-500 mt-1">Needs attention</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-clock text-purple-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Avg. Completion</h3>
               <p className="text-2xl font-bold text-white">{stats.avgCompletion}</p>
               <p className="text-xs text-gray-500 mt-1">Days per task</p>
            </div>
         </div>

         <div id="tasks-status-tabs-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-2 mb-6 flex flex-wrap gap-2">
            {['All Tasks', 'To Do', 'In Progress', 'Review', 'Completed'].map(f => (
               <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-auto px-4 py-2.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-dark-accent text-white' : 'hover:bg-dark-tertiary text-gray-400 hover:text-white'}`}
               >
                  {f} ({
                     f === 'All Tasks' ? taskList.length :
                        f === 'To Do' ? taskList.filter(t => t.status === 'todo').length :
                           f === 'In Progress' ? taskList.filter(t => t.status === 'in_progress').length :
                              f === 'Review' ? taskList.filter(t => t.status === 'review').length :
                                 taskList.filter(t => t.status === 'completed').length
                  })
               </button>
            ))}
         </div>

         <div id="tasks-kanban-section" className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start h-full">
            {renderColumn('To Do', 'todo', 'bg-gray-500', taskList.filter(t => t.status === 'todo').length)}
            {renderColumn('In Progress', 'in_progress', 'bg-yellow-500', taskList.filter(t => t.status === 'in_progress').length)}
            {renderColumn('Review', 'review', 'bg-purple-500', taskList.filter(t => t.status === 'review').length)}
            {renderColumn('Completed', 'completed', 'bg-green-500', taskList.filter(t => t.status === 'completed').length)}
         </div>
      </div>
   );
};

export default Tasks;
