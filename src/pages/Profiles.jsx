import React from 'react';
import Plot from 'react-plotly.js';

const Profiles = () => {
   const roleData = [{
      type: 'pie',
      labels: ['Backend', 'Frontend', 'Team Leads', 'Admins', 'Marketing'],
      values: [8, 6, 5, 3, 2],
      marker: { colors: ['#10B981', '#06B6D4', '#8B5CF6', '#3B82F6', '#F59E0B'] },
      textinfo: 'label+percent',
      textfont: { color: '#FFFFFF', size: 11 },
      hovertemplate: '%{label}: %{value} members<extra></extra>'
   }];

   const roleLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   const performanceData = [{
      type: 'bar',
      x: ['Backend', 'Frontend', 'Team Leads', 'Admins', 'Marketing'],
      y: [93, 95, 91, 92, 91],
      marker: { color: ['#10B981', '#06B6D4', '#8B5CF6', '#3B82F6', '#F59E0B'] }
   }];

   const performanceLayout = {
      autosize: true,
      xaxis: { title: '', gridcolor: '#2A2A2A', color: '#9CA3AF' },
      yaxis: { title: 'Success Rate (%)', gridcolor: '#2A2A2A', color: '#9CA3AF', range: [0, 100] },
      margin: { t: 20, r: 20, b: 60, l: 60 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   return (
      <div className="p-8 space-y-8">
         <div id="profiles-header-section">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Team Profiles</h1>
                  <p className="text-gray-400">Manage team members, roles, and access permissions</p>
               </div>
               <div className="flex items-center space-x-3">
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-filter"></i>
                     <span>Filter by Role</span>
                  </button>
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-download"></i>
                     <span>Export</span>
                  </button>
                  <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                     <i className="fa-solid fa-user-plus"></i>
                     <span>Add New Member</span>
                  </button>
               </div>
            </div>
         </div>

         <div id="profiles-stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-users text-blue-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Total Members</h3>
               <p className="text-2xl font-bold text-white">24</p>
               <p className="text-xs text-green-500 mt-1">+3 this month</p>
            </div>
            {/* ... other stats cards ... */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-check text-green-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Active Now</h3>
               <p className="text-2xl font-bold text-white">18</p>
               <p className="text-xs text-gray-500 mt-1">75% online rate</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-tie text-purple-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Team Leads</h3>
               <p className="text-2xl font-bold text-white">5</p>
               <p className="text-xs text-gray-500 mt-1">Managing teams</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-clock text-yellow-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">On Leave</h3>
               <p className="text-2xl font-bold text-white">2</p>
               <p className="text-xs text-gray-500 mt-1">Returning soon</p>
            </div>
         </div>

         <div id="profiles-role-tabs-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-2 flex flex-wrap gap-2">
            <button className="flex-auto px-4 py-2.5 bg-dark-accent text-white rounded-lg text-sm font-medium transition">All Members (24)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">Admins (3)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">Team Leads (5)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">Backend (8)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">Frontend (6)</button>
            <button className="flex-auto px-4 py-2.5 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">Marketing (2)</button>
         </div>

         <div id="profiles-grid-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Alex Johnson */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
               <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                     <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg" alt="Profile" className="w-16 h-16 rounded-full border-2 border-dark-accent" />
                     <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-dark-secondary"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                     <button className="text-gray-400 hover:text-white transition"><i className="fa-solid fa-edit"></i></button>
                     <button className="text-gray-400 hover:text-white transition"><i className="fa-solid fa-ellipsis-v"></i></button>
                  </div>
               </div>
               <h3 className="text-lg font-semibold text-white mb-1">Alex Johnson</h3>
               <p className="text-sm text-dark-accent mb-3">Main Admin</p>
               <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-400"><i className="fa-solid fa-envelope w-4"></i><span>alex.johnson@fortisweb.com</span></div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400"><i className="fa-solid fa-phone w-4"></i><span>+1 (555) 123-4567</span></div>
               </div>
               <div className="flex items-center space-x-2 mb-4">
                  <span className="px-2 py-1 bg-dark-accent bg-opacity-20 text-dark-accent rounded text-xs">Full Access</span>
                  <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-500 rounded text-xs">Active</span>
               </div>
               <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between text-xs">
                     <div><p className="text-gray-400 mb-1">Tasks Assigned</p><p className="text-white font-semibold">156</p></div>
                     <div><p className="text-gray-400 mb-1">Completed</p><p className="text-white font-semibold">142</p></div>
                     <div><p className="text-gray-400 mb-1">Success Rate</p><p className="text-white font-semibold">91%</p></div>
                  </div>
               </div>
            </div>

            {/* Michael Chen */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
               <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                     <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg" alt="Profile" className="w-16 h-16 rounded-full" />
                     <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-dark-secondary"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                     <button className="text-gray-400 hover:text-white transition"><i className="fa-solid fa-edit"></i></button>
                     <button className="text-gray-400 hover:text-white transition"><i className="fa-solid fa-ellipsis-v"></i></button>
                  </div>
               </div>
               <h3 className="text-lg font-semibold text-white mb-1">Michael Chen</h3>
               <p className="text-sm text-blue-500 mb-3">Admin</p>
               <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-400"><i className="fa-solid fa-envelope w-4"></i><span>michael.chen@fortisweb.com</span></div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400"><i className="fa-solid fa-phone w-4"></i><span>+1 (555) 234-5678</span></div>
               </div>
               <div className="flex items-center space-x-2 mb-4">
                  <span className="px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-500 rounded text-xs">Admin Access</span>
                  <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-500 rounded text-xs">Active</span>
               </div>
               <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between text-xs">
                     <div><p className="text-gray-400 mb-1">Tasks Assigned</p><p className="text-white font-semibold">124</p></div>
                     <div><p className="text-gray-400 mb-1">Completed</p><p className="text-white font-semibold">115</p></div>
                     <div><p className="text-gray-400 mb-1">Success Rate</p><p className="text-white font-semibold">93%</p></div>
                  </div>
               </div>
            </div>

            {/* Sarah Williams */}
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
               <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                     <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg" alt="Profile" className="w-16 h-16 rounded-full" />
                     <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-dark-secondary"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                     <button className="text-gray-400 hover:text-white transition"><i className="fa-solid fa-edit"></i></button>
                     <button className="text-gray-400 hover:text-white transition"><i className="fa-solid fa-ellipsis-v"></i></button>
                  </div>
               </div>
               <h3 className="text-lg font-semibold text-white mb-1">Sarah Williams</h3>
               <p className="text-sm text-purple-500 mb-3">Team Lead</p>
               <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-400"><i className="fa-solid fa-envelope w-4"></i><span>sarah.williams@fortisweb.com</span></div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400"><i className="fa-solid fa-phone w-4"></i><span>+1 (555) 345-6789</span></div>
               </div>
               <div className="flex items-center space-x-2 mb-4">
                  <span className="px-2 py-1 bg-purple-500 bg-opacity-20 text-purple-500 rounded text-xs">Team Lead</span>
                  <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-500 rounded text-xs">Active</span>
               </div>
               <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between text-xs">
                     <div><p className="text-gray-400 mb-1">Tasks Assigned</p><p className="text-white font-semibold">98</p></div>
                     <div><p className="text-gray-400 mb-1">Completed</p><p className="text-white font-semibold">89</p></div>
                     <div><p className="text-gray-400 mb-1">Success Rate</p><p className="text-white font-semibold">91%</p></div>
                  </div>
               </div>
            </div>
            {/* ... other profiles would go here ... */}
         </div>

         <div id="profiles-chart-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Team Distribution by Role</h3>
                  <p className="text-sm text-gray-400">Member breakdown across departments</p>
               </div>
               <div className="w-full h-[300px]">
                  <Plot
                     data={roleData}
                     layout={roleLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Performance Overview</h3>
                  <p className="text-sm text-gray-400">Average success rate by department</p>
               </div>
               <div className="w-full h-[300px]">
                  <Plot
                     data={performanceData}
                     layout={performanceLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>
         </div>
      </div>
   );
};

export default Profiles;
