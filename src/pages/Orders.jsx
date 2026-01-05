import React, { useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useCompanyStore } from '../store/company.store';
import { useProjectStore } from '../store/project.store';
import { usePaymentStore } from '../store/payment.store';

const Orders = () => {
   const statusData = [{
      type: 'pie',
      labels: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'],
      values: [12, 8, 24, 156, 7],
      marker: {
         colors: ['#EAB308', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444']
      },
      textinfo: 'label+percent',
      textfont: { color: '#FFFFFF', size: 11 },
      hovertemplate: '%{label}: %{value} orders<extra></extra>'
   }];

   const statusLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   const trendData = [{
      type: 'scatter',
      mode: 'lines',
      name: 'Orders',
      x: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
      y: [28, 35, 42, 38, 47, 52],
      line: { color: '#FF0000', width: 3 },
      fill: 'tozeroy',
      fillcolor: 'rgba(255, 0, 0, 0.1)'
   }];

   const trendLayout = {
      autosize: true,
      title: { text: '', font: { size: 0 } },
      xaxis: { title: '', gridcolor: '#2A2A2A', color: '#9CA3AF' },
      yaxis: { title: 'Orders', gridcolor: '#2A2A2A', color: '#9CA3AF' },
      margin: { t: 20, r: 20, b: 40, l: 60 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false,
      hovermode: 'x unified'
   };

   const { companies } = useCompanyStore();
   const { projects, getProjectsByCompany, isLoading } = useProjectStore();
   const { payments, getPaymentsByCompany } = usePaymentStore();

   const companyId = companies?.data?.companies?.[0]?._id;

   useEffect(() => {
      if (companyId) {
         getProjectsByCompany(companyId);
         getPaymentsByCompany(companyId);
      }
   }, [companyId, getProjectsByCompany, getPaymentsByCompany]);

   const getPendingOrders = (projects = []) =>
      projects.filter(project => project.status === 'pending');

   const getInProgressOrders = (projects = []) =>
      projects.filter(project =>
         ['in_progress', 'review', 'revision'].includes(project.status)
      );

   const getCompletedOrders = (projects = []) =>
      projects.filter(project => project.status === 'completed');

   const getCancelledOrders = (projects = []) =>
      projects.filter(project => project.status === 'cancelled');

   const projectsList = projects?.data?.projects || [];
   const paymentsList = payments?.data?.payments || [];

   /* --- существующие --- */
   const pendingOrders = useMemo(
      () => getPendingOrders(projectsList),
      [projectsList]
   );

   const inProgressOrders = useMemo(
      () => getInProgressOrders(projectsList),
      [projectsList]
   );

   const completedOrders = useMemo(
      () => getCompletedOrders(projectsList),
      [projectsList]
   );

   const cancelledOrders = useMemo(
      () => getCancelledOrders(projectsList),
      [projectsList]
   );

   /* --- Assigned (Completed + Paid) --- */
   const assignedOrders = useMemo(() => {
      const paymentsMap = new Map();

      paymentsList.forEach(payment => {
         if (payment.project?._id) {
            paymentsMap.set(payment.project._id, payment);
         }
      });

      return projectsList.filter(project => {
         const payment = paymentsMap.get(project._id);

         return (
            project.status === 'completed' &&
            payment &&
            payment.status === 'completed'
         );
      });
   }, [projectsList, paymentsList]);

   if (isLoading) return null;

   return (
      <div className="p-8 space-y-8">
         <div id="orders-header-section">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Orders Management</h1>
                  <p className="text-gray-400">Manage all orders received from @fortisweb_bot and manual entries</p>
               </div>
               <div className="flex items-center space-x-3">
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-filter"></i>
                     <span>Filters</span>
                  </button>
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-download"></i>
                     <span>Export</span>
                  </button>
                  <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                     <i className="fa-solid fa-plus"></i>
                     <span>Add Manual Order</span>
                  </button>
               </div>
            </div>
         </div>

         <div id="orders-stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-clock text-yellow-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Pending</h3>
               <p className="text-2xl font-bold text-white">{pendingOrders?.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-check text-blue-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Completed & Paid</h3>
               <p className="text-2xl font-bold text-white">{assignedOrders.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-spinner text-purple-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">In Progress</h3>
               <p className="text-2xl font-bold text-white">{inProgressOrders?.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-check-circle text-green-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Completed</h3>
               <p className="text-2xl font-bold text-white">{completedOrders?.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-times-circle text-red-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Cancelled</h3>
               <p className="text-2xl font-bold text-white">{cancelledOrders?.length || 0}</p>
            </div>
         </div>

         <div id="orders-filters-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                  <div>
                     <label className="text-xs text-gray-400 mb-1 block">Status</label>
                     <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full sm:w-auto">
                        <option>All Statuses</option>
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Review</option>
                        <option>Revision</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                     </select>
                  </div>
                  {/* Other filters */}
                  <div>
                     <label className="text-xs text-gray-400 mb-1 block">Date Range</label>
                     <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full sm:w-auto">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>Last 3 Months</option>
                        <option>All Time</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 mb-1 block">Amount Range</label>
                     <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full sm:w-auto">
                        <option>All Amounts</option>
                        <option>$0 - $1,000</option>
                        <option>$1,000 - $5,000</option>
                        <option>$5,000 - $10,000</option>
                        <option>$10,000+</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 mb-1 block">Source</label>
                     <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full sm:w-auto">
                        <option>All Sources</option>
                        <option>Telegram Bot</option>
                        <option>Manual Entry</option>
                     </select>
                  </div>
               </div>
               <button className="text-dark-accent hover:text-red-600 text-sm font-medium transition self-start lg:self-center">Clear Filters</button>
            </div>
         </div>

         <div id="orders-table-section" className="bg-dark-secondary border border-gray-800 rounded-xl overflow-hidden mb-8">
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead className="bg-dark-tertiary">
                     <tr>
                        <th className="px-6 py-4 text-left"><input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-dark-tertiary text-dark-accent focus:ring-0" /></th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                     {/* Row 1 */}
                     <tr className="hover:bg-dark-tertiary transition">
                        <td className="px-6 py-4"><input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-dark-tertiary text-dark-accent focus:ring-0" /></td>
                        <td className="px-6 py-4 text-sm text-white font-medium">#ORD-1247</td>
                        <td className="px-6 py-4 text-sm text-gray-400"><div>Jan 15, 2024</div><div className="text-xs text-gray-500">10:32 AM</div></td>
                        <td className="px-6 py-4"><div className="flex items-center space-x-3"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg" alt="Client" className="w-9 h-9 rounded-full" /><div><div className="text-sm text-white font-medium">Michael Chen</div><div className="text-xs text-gray-500">@mchen_tech</div></div></div></td>
                        <td className="px-6 py-4 text-sm text-gray-400">E-commerce Platform Development</td>
                        <td className="px-6 py-4 text-sm text-white font-semibold">$8,500</td>
                        <td className="px-6 py-4"><span className="flex items-center space-x-1 text-xs"><i className="fa-brands fa-telegram text-blue-500"></i><span className="text-gray-400">Bot</span></span></td>
                        <td className="px-6 py-4"><span className="px-3 py-1 bg-yellow-500 bg-opacity-20 text-yellow-500 rounded-full text-xs font-medium">Pending</span></td>
                        <td className="px-6 py-4"><div className="flex items-center space-x-2"><button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition">Accept</button><button className="bg-dark-tertiary hover:bg-gray-700 text-gray-400 hover:text-white px-3 py-1.5 rounded text-xs font-medium transition">Reject</button><button className="text-gray-400 hover:text-white transition"><i className="fa-solid fa-ellipsis-v"></i></button></div></td>
                     </tr>
                     {/* Row 2 */}
                     <tr className="hover:bg-dark-tertiary transition">
                        <td className="px-6 py-4"><input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-dark-tertiary text-dark-accent focus:ring-0" /></td>
                        <td className="px-6 py-4 text-sm text-white font-medium">#ORD-1246</td>
                        <td className="px-6 py-4 text-sm text-gray-400"><div>Jan 15, 2024</div><div className="text-xs text-gray-500">09:15 AM</div></td>
                        <td className="px-6 py-4"><div className="flex items-center space-x-3"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg" alt="Client" className="w-9 h-9 rounded-full" /><div><div className="text-sm text-white font-medium">Sarah Williams</div><div className="text-xs text-gray-500">@swilliams_design</div></div></div></td>
                        <td className="px-6 py-4 text-sm text-gray-400">Landing Page Design & Development</td>
                        <td className="px-6 py-4 text-sm text-white font-semibold">$2,800</td>
                        <td className="px-6 py-4"><span className="flex items-center space-x-1 text-xs"><i className="fa-brands fa-telegram text-blue-500"></i><span className="text-gray-400">Bot</span></span></td>
                        <td className="px-6 py-4"><span className="px-3 py-1 bg-blue-500 bg-opacity-20 text-blue-500 rounded-full text-xs font-medium">Assigned</span></td>
                        <td className="px-6 py-4"><div className="flex items-center space-x-2"><button className="bg-dark-accent hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition">View Details</button><button className="text-gray-400 hover:text-white transition"><i className="fa-solid fa-ellipsis-v"></i></button></div></td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>

         <div id="orders-chart-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Orders by Status</h3>
                  <p className="text-sm text-gray-400">Distribution of order statuses</p>
               </div>
               <div className="w-full h-[300px]">
                  <Plot
                     data={statusData}
                     layout={statusLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Monthly Orders Trend</h3>
                  <p className="text-sm text-gray-400">Order volume over time</p>
               </div>
               <div className="w-full h-[300px]">
                  <Plot
                     data={trendData}
                     layout={trendLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>
         </div>

         <div id="telegram-integration-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Telegram Bot Integration</h3>
                  <p className="text-sm text-gray-400">Connect with @fortisweb_bot for automatic order intake</p>
               </div>
               <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-500 text-sm font-medium">Connected</span>
               </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-dark-tertiary rounded-lg p-5">
                  <div className="flex items-center space-x-3 mb-3">
                     <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <i className="fa-brands fa-telegram text-blue-500 text-xl"></i>
                     </div>
                     <div>
                        <h4 className="text-white font-medium">Bot Status</h4>
                     </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">Active</p>
                  <p className="text-xs text-gray-500">Last sync: 2 min ago</p>
               </div>
               <div className="bg-dark-tertiary rounded-lg p-5">
                  <div className="flex items-center space-x-3 mb-3">
                     <div className="w-10 h-10 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-inbox text-purple-500 text-xl"></i>
                     </div>
                     <div>
                        <h4 className="text-white font-medium">Messages</h4>
                     </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">1,247</p>
                  <p className="text-xs text-gray-500">Total received</p>
               </div>
               {/* ... other stats ... */}
            </div>
         </div>
      </div>
   );
};

export default Orders;
