import React from 'react';
import Plot from 'react-plotly.js';

const Dashboard = () => {
   const revenueData = [{
      type: 'scatter',
      mode: 'lines',
      name: 'Revenue',
      x: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
      y: [8500, 12000, 9800, 15200, 18400, 22600],
      line: { color: '#FF0000', width: 3 },
      fill: 'tozeroy',
      fillcolor: 'rgba(255, 0, 0, 0.1)'
   }];

   const revenueLayout = {
      autosize: true,
      title: { text: '', font: { size: 0 } },
      xaxis: { title: '', gridcolor: '#2A2A2A', color: '#9CA3AF' },
      yaxis: { title: 'Revenue ($)', gridcolor: '#2A2A2A', color: '#9CA3AF' },
      margin: { t: 20, r: 20, b: 40, l: 60 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false,
      hovermode: 'x unified'
   };

   const salaryData = [{
      type: 'pie',
      labels: ['Team (70%)', 'Main Admin (10%)', 'Admin (10%)', 'Company (10%)'],
      values: [70, 10, 10, 10],
      marker: { colors: ['#FF0000', '#3B82F6', '#10B981', '#8B5CF6'] },
      textinfo: 'label+percent',
      textfont: { color: '#FFFFFF', size: 12 },
      hovertemplate: '%{label}: %{value}%<extra></extra>'
   }];

   const salaryLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   return (
      <div className="p-8 space-y-8">
         <div id="dashboard-header-section">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
            <p className="text-gray-400">Welcome back! Here's what's happening with your projects today.</p>
         </div>

         <div id="stats-cards-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-dark-accent bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-brands fa-telegram text-dark-accent text-2xl"></i>
                  </div>
                  <span className="text-green-500 text-sm font-medium">+12 New</span>
               </div>
               <h3 className="text-gray-400 text-sm mb-1">New Orders</h3>
               <p className="text-3xl font-bold text-white">24</p>
               <p className="text-xs text-gray-500 mt-2">From @fortisweb_bot</p>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-folder-open text-blue-500 text-2xl"></i>
                  </div>
                  <span className="text-blue-500 text-sm font-medium">8 Active</span>
               </div>
               <h3 className="text-gray-400 text-sm mb-1">Total Projects</h3>
               <p className="text-3xl font-bold text-white">156</p>
               <p className="text-xs text-gray-500 mt-2">24 in progress</p>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-dollar-sign text-green-500 text-2xl"></i>
                  </div>
                  <span className="text-green-500 text-sm font-medium">+18%</span>
               </div>
               <h3 className="text-gray-400 text-sm mb-1">Today's Revenue</h3>
               <p className="text-3xl font-bold text-white">$12,540</p>
               <p className="text-xs text-gray-500 mt-2">From 8 projects</p>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-users text-purple-500 text-2xl"></i>
                  </div>
                  <span className="text-purple-500 text-sm font-medium">18 Online</span>
               </div>
               <h3 className="text-gray-400 text-sm mb-1">Team Members</h3>
               <p className="text-3xl font-bold text-white">24</p>
               <p className="text-xs text-gray-500 mt-2">6 roles active</p>
            </div>
         </div>

         <div id="charts-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">Revenue Overview</h3>
                     <p className="text-sm text-gray-400">Monthly revenue breakdown</p>
                  </div>
                  <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent">
                     <option>Last 6 Months</option>
                     <option>Last Year</option>
                     <option>All Time</option>
                  </select>
               </div>
               <div className="w-full h-[300px]">
                  <Plot
                     data={revenueData}
                     layout={revenueLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Salary Distribution</h3>
                  <p className="text-sm text-gray-400">Per project breakdown</p>
               </div>
               <div className="w-full h-[300px]">
                  <Plot
                     data={salaryData}
                     layout={salaryLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
               <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                     <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-gray-400">Team (70%)</span>
                     </div>
                     <span className="text-white font-medium">$7,000</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                     <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-400">Main Admin (10%)</span>
                     </div>
                     <span className="text-white font-medium">$1,000</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                     <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-400">Admin (10%)</span>
                     </div>
                     <span className="text-white font-medium">$1,000</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                     <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-400">Company (10%)</span>
                     </div>
                     <span className="text-white font-medium">$1,000</span>
                  </div>
               </div>
            </div>
         </div>

         <div id="orders-section">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">Recent Orders from Telegram Bot</h3>
                     <p className="text-sm text-gray-400">Orders received via @fortisweb_bot</p>
                  </div>
                  <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                     <i className="fa-solid fa-plus"></i>
                     <span>Manual Order</span>
                  </button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full">
                     <thead className="bg-dark-tertiary">
                        <tr>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                           <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-800">
                        <tr className="hover:bg-dark-tertiary transition">
                           <td className="px-6 py-4 text-sm text-white font-medium">#ORD-1247</td>
                           <td className="px-6 py-4 text-sm text-gray-400">Jan 15, 2024</td>
                           <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                 <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg" alt="Client" className="w-8 h-8 rounded-full" />
                                 <span className="text-sm text-white">Michael Chen</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-sm text-gray-400">E-commerce Platform Development</td>
                           <td className="px-6 py-4 text-sm text-white font-semibold">$8,500</td>
                           <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-yellow-500 bg-opacity-20 text-yellow-500 rounded-full text-xs font-medium">Pending</span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                 <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition">Accept</button>
                                 <button className="bg-dark-tertiary hover:bg-gray-700 text-gray-400 hover:text-white px-3 py-1 rounded text-xs font-medium transition">Reject</button>
                              </div>
                           </td>
                        </tr>
                        <tr className="hover:bg-dark-tertiary transition">
                           <td className="px-6 py-4 text-sm text-white font-medium">#ORD-1246</td>
                           <td className="px-6 py-4 text-sm text-gray-400">Jan 15, 2024</td>
                           <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                 <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg" alt="Client" className="w-8 h-8 rounded-full" />
                                 <span className="text-sm text-white">Sarah Williams</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-sm text-gray-400">Landing Page Design & Development</td>
                           <td className="px-6 py-4 text-sm text-white font-semibold">$2,800</td>
                           <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-blue-500 bg-opacity-20 text-blue-500 rounded-full text-xs font-medium">Assigned</span>
                           </td>
                           <td className="px-6 py-4">
                              <button className="bg-dark-accent hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition">View Details</button>
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         <div id="team-profiles-section" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">Team Members</h3>
                     <p className="text-sm text-gray-400">Active employees and roles</p>
                  </div>
                  <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                     <i className="fa-solid fa-user-plus"></i>
                     <span>Add Member</span>
                  </button>
               </div>
               <div className="space-y-4">
                  {/* Sample Team Members */}
                  <div className="flex items-center space-x-4 p-4 bg-dark-tertiary rounded-lg hover:bg-gray-800 transition">
                     <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg" alt="Team" className="w-12 h-12 rounded-full border-2 border-dark-accent" />
                     <div className="flex-1">
                        <h4 className="text-white font-medium">Alex Johnson</h4>
                        <p className="text-sm text-dark-accent">Main Admin</p>
                     </div>
                     <div className="text-right">
                        <p className="text-sm text-gray-400">24 Tasks</p>
                        <div className="flex items-center space-x-1 mt-1">
                           <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                           <span className="text-xs text-green-500">Online</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Dashboard;
