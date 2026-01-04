import React from 'react';

const Tasks = () => {
   return (
      <div className="p-8 space-y-8">
         <div id="tasks-header-section">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Task Management</h1>
                  <p className="text-gray-400">Organize, assign, and track project tasks across your team</p>
               </div>
               <div className="flex items-center space-x-3">
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-filter"></i><span>Filter</span>
                  </button>
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-sort"></i><span>Sort</span>
                  </button>
                  <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
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
               <p className="text-2xl font-bold text-white">147</p>
               <p className="text-xs text-green-500 mt-1">+12 this week</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-clock text-yellow-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">In Progress</h3>
               <p className="text-2xl font-bold text-white">23</p>
               <p className="text-xs text-gray-500 mt-1">Active tasks</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-check-circle text-green-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Completed</h3>
               <p className="text-2xl font-bold text-white">124</p>
               <p className="text-xs text-green-500 mt-1">84% completion</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-exclamation-triangle text-red-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Overdue</h3>
               <p className="text-2xl font-bold text-white">3</p>
               <p className="text-xs text-red-500 mt-1">Needs attention</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-clock text-purple-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Avg. Completion</h3>
               <p className="text-2xl font-bold text-white">3.2</p>
               <p className="text-xs text-gray-500 mt-1">Days per task</p>
            </div>
         </div>

         <div id="tasks-status-tabs-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-2 mb-6 flex flex-wrap gap-2">
            <button className="flex-auto px-4 py-2.5 bg-dark-accent text-white rounded-lg text-sm font-medium transition">All Tasks (147)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">To Do (18)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">In Progress (23)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">Review (8)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">Completed (124)</button>
         </div>

         <div id="tasks-kanban-section" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* To Do Column */}
            <div id="todo-column" className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                     <div className="w-3 h-3 bg-gray-500 rounded-full"></div><span>To Do</span>
                  </h3>
                  <span className="text-sm text-gray-400 bg-dark-tertiary px-2 py-1 rounded">18</span>
               </div>
               <div className="space-y-3">
                  <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer">
                     <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">E-commerce Platform UI</h4>
                        <span className="px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-500 rounded text-xs">Frontend</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">Design responsive product pages and shopping cart interface</p>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg" alt="Assignee" className="w-6 h-6 rounded-full" /><span className="text-xs text-gray-400">Emma Davis</span></div>
                        <span className="text-xs text-gray-500">Due: Dec 28</span>
                     </div>
                  </div>
                  <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer">
                     <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">API Integration</h4>
                        <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-500 rounded text-xs">Backend</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">Integrate payment gateway and user authentication</p>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg" alt="Assignee" className="w-6 h-6 rounded-full" /><span className="text-xs text-gray-400">David Brown</span></div>
                        <span className="text-xs text-gray-500">Due: Dec 30</span>
                     </div>
                  </div>
                  <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer">
                     <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">SEO Optimization</h4>
                        <span className="px-2 py-1 bg-orange-500 bg-opacity-20 text-orange-500 rounded text-xs">Marketing</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">Optimize website content and meta tags for search engines</p>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg" alt="Assignee" className="w-6 h-6 rounded-full" /><span className="text-xs text-gray-400">Robert Taylor</span></div>
                        <span className="text-xs text-gray-500">Due: Jan 2</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* In Progress Column */}
            <div id="progress-column" className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                     <div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span>In Progress</span>
                  </h3>
                  <span className="text-sm text-gray-400 bg-dark-tertiary px-2 py-1 rounded">23</span>
               </div>
               <div className="space-y-3">
                  <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer">
                     <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Database Optimization</h4>
                        <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-500 rounded text-xs">Backend</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">Optimize database queries and improve performance</p>
                     <div className="w-full bg-gray-700 rounded-full h-2 mb-3"><div className="bg-yellow-500 h-2 rounded-full" style={{ width: '65%' }}></div></div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg" alt="Assignee" className="w-6 h-6 rounded-full" /><span className="text-xs text-gray-400">Michael Chen</span></div>
                        <span className="text-xs text-yellow-500">65% complete</span>
                     </div>
                  </div>
                  <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer">
                     <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Mobile App Design</h4>
                        <span className="px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-500 rounded text-xs">Frontend</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">Create mobile-first responsive design components</p>
                     <div className="w-full bg-gray-700 rounded-full h-2 mb-3"><div className="bg-yellow-500 h-2 rounded-full" style={{ width: '40%' }}></div></div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg" alt="Assignee" className="w-6 h-6 rounded-full" /><span className="text-xs text-gray-400">Sarah Williams</span></div>
                        <span className="text-xs text-yellow-500">40% complete</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Review Column */}
            <div id="review-column" className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                     <div className="w-3 h-3 bg-purple-500 rounded-full"></div><span>Review</span>
                  </h3>
                  <span className="text-sm text-gray-400 bg-dark-tertiary px-2 py-1 rounded">8</span>
               </div>
               <div className="space-y-3">
                  <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer">
                     <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">User Authentication System</h4>
                        <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-500 rounded text-xs">Backend</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">Implement secure login and registration functionality</p>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-9.jpg" alt="Assignee" className="w-6 h-6 rounded-full" /><span className="text-xs text-gray-400">James Wilson</span></div>
                        <span className="text-xs text-purple-500">Ready for review</span>
                     </div>
                  </div>
                  <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer">
                     <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Landing Page Content</h4>
                        <span className="px-2 py-1 bg-orange-500 bg-opacity-20 text-orange-500 rounded text-xs">Marketing</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">Write compelling copy for the main landing page</p>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-7.jpg" alt="Assignee" className="w-6 h-6 rounded-full" /><span className="text-xs text-gray-400">Lisa Garcia</span></div>
                        <span className="text-xs text-purple-500">Awaiting approval</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Completed Column */}
            <div id="completed-column" className="bg-dark-secondary border border-gray-800 rounded-xl p-5">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                     <div className="w-3 h-3 bg-green-500 rounded-full"></div><span>Completed</span>
                  </h3>
                  <span className="text-sm text-gray-400 bg-dark-tertiary px-2 py-1 rounded">124</span>
               </div>
               <div className="space-y-3">
                  <div className="bg-dark-tertiary border border-gray-700 rounded-lg p-4 hover:border-dark-accent transition cursor-pointer">
                     <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Logo Design</h4>
                        <span className="px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-500 rounded text-xs">Design</span>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">Create brand identity and logo variations</p>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg" alt="Assignee" className="w-6 h-6 rounded-full" /><span className="text-xs text-gray-400">Anna Smith</span></div>
                        <span className="text-xs text-green-500">Completed</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Tasks;
