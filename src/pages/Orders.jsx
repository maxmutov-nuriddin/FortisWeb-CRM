import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { useCompanyStore } from '../store/company.store';
import { useProjectStore } from '../store/project.store';
import { usePaymentStore } from '../store/payment.store';

const Orders = () => {
   const [statusFilter, setStatusFilter] = useState('All Statuses');
   const [dateFilter, setDateFilter] = useState('All Time');
   const [amountFilter, setAmountFilter] = useState('All Amounts');
   const [searchQuery, setSearchQuery] = useState('');
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

   const projectsList = projects?.data?.projects || [];
   const paymentsList = payments?.data?.payments || [];

   const filteredOrders = useMemo(() => {
      let result = [...projectsList];

      // 1. Status Filter
      if (statusFilter !== 'All Statuses') {
         result = result.filter(project => {
            if (statusFilter === 'Pending') return project.status === 'pending';
            if (statusFilter === 'In Progress') return ['in_progress', 'assigned'].includes(project.status);
            if (statusFilter === 'Review') return project.status === 'review';
            if (statusFilter === 'Revision') return project.status === 'revision';
            if (statusFilter === 'Completed') return project.status === 'completed';
            if (statusFilter === 'Cancelled') return project.status === 'cancelled';
            return true;
         });
      }

      // 2. Date Filter
      if (dateFilter !== 'All Time') {
         const now = new Date();
         const projectDate = (project) => new Date(project.createdAt);

         if (dateFilter === 'Last 7 Days') {
            const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
            result = result.filter(p => projectDate(p) >= sevenDaysAgo);
         } else if (dateFilter === 'Last 30 Days') {
            const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
            result = result.filter(p => projectDate(p) >= thirtyDaysAgo);
         } else if (dateFilter === 'Last 3 Months') {
            const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
            result = result.filter(p => projectDate(p) >= threeMonthsAgo);
         }
      }

      // 3. Amount Filter
      if (amountFilter !== 'All Amounts') {
         result = result.filter(project => {
            const amount = project.budget || 0;
            if (amountFilter === '$0 - $1,000') return amount <= 1000;
            if (amountFilter === '$1,000 - $5,000') return amount > 1000 && amount <= 5000;
            if (amountFilter === '$5,000 - $10,000') return amount > 5000 && amount <= 10000;
            if (amountFilter === '$10,000+') return amount > 10000;
            return true;
         });
      }

      // 4. Search Query (Name/Title)
      if (searchQuery) {
         const query = searchQuery.toLowerCase();
         result = result.filter(project =>
            (project.title && project.title.toLowerCase().includes(query)) ||
            (project.client?.name && project.client.name.toLowerCase().includes(query)) ||
            (project.description && project.description.toLowerCase().includes(query)) ||
            (project._id && project._id.toLowerCase().includes(query))
         );
      }

      return result;
   }, [projectsList, statusFilter, dateFilter, amountFilter, searchQuery]);

   /* --- существующие helpers helpers used for stats --- */
   const getPendingOrders = (projects = []) =>
      projects.filter(project => project.status === 'pending');

   const getInProgressOrders = (projects = []) =>
      projects.filter(project =>
         ['in_progress', 'review', 'revision', 'assigned'].includes(project.status)
      );

   const getCompletedOrders = (projects = []) =>
      projects.filter(project => project.status === 'completed');

   const getCancelledOrders = (projects = []) =>
      projects.filter(project => project.status === 'cancelled');

   /* --- Stats --- */
   const pendingOrders = useMemo(() => getPendingOrders(projectsList), [projectsList]);
   const inProgressOrders = useMemo(() => getInProgressOrders(projectsList), [projectsList]);
   const completedOrders = useMemo(() => getCompletedOrders(projectsList), [projectsList]);
   const cancelledOrders = useMemo(() => getCancelledOrders(projectsList), [projectsList]);

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

   console.log(filteredOrders);


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
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap w-full">
                  <div className="w-full sm:w-auto flex-grow max-w-md">
                     <label className="text-xs text-gray-400 mb-1 block">Search</label>
                     <div className="relative">
                        <input
                           type="text"
                           placeholder="Search by ID, Client, or Title..."
                           className="bg-dark-tertiary border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <i className="fa-solid fa-search absolute left-3 top-2.5 text-gray-500"></i>
                     </div>
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 mb-1 block">Status</label>
                     <select
                        className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full sm:w-auto"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                     >
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
                     <select
                        className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full sm:w-auto"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                     >
                        <option>All Time</option>
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>Last 3 Months</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 mb-1 block">Amount Range</label>
                     <select
                        className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full sm:w-auto"
                        value={amountFilter}
                        onChange={(e) => setAmountFilter(e.target.value)}
                     >
                        <option>All Amounts</option>
                        <option>$0 - $1,000</option>
                        <option>$1,000 - $5,000</option>
                        <option>$5,000 - $10,000</option>
                        <option>$10,000+</option>
                     </select>
                  </div>
               </div>
               <button
                  className="text-dark-accent hover:text-red-600 text-sm font-medium transition self-start lg:self-center whitespace-nowrap"
                  onClick={() => {
                     setStatusFilter('All Statuses');
                     setDateFilter('All Time');
                     setAmountFilter('All Amounts');
                     setSearchQuery('');
                  }}
               >Clear Filters</button>
            </div>
         </div>

         <div id="orders-table-section" className="bg-dark-secondary border border-gray-800 rounded-xl overflow-hidden mb-8">
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead className="bg-dark-tertiary">
                     <tr>
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
                     {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                           <tr key={order._id} className="hover:bg-dark-tertiary transition">
                              <td className="px-6 py-4 text-sm text-white font-medium">#{order._id.substring(order._id.length - 8).toUpperCase()}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                 <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                                 <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                                       {order.client?.name ? order.client.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                       <div className="text-sm text-white font-medium">{order.client?.name || 'Unknown Client'}</div>
                                       <div className="text-xs text-gray-500">{order.client?.username || 'No username'}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate" title={order.description}>
                                 {order.title || order.description || 'No description'}
                              </td>
                              <td className="px-6 py-4 text-sm text-white font-semibold">
                                 ${(order.budget || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                 <span className="flex items-center space-x-1 text-xs">
                                    <span className="text-gray-400">{order?.source}</span>
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 {(() => {
                                    let statusColor = 'text-gray-500 bg-gray-500';
                                    let statusText = order.status;

                                    switch (order.status) {
                                       case 'pending':
                                          statusColor = 'text-yellow-500 bg-yellow-500';
                                          break;
                                       case 'assigned':
                                       case 'in_progress':
                                          statusColor = 'text-blue-500 bg-blue-500';
                                          statusText = 'In Progress';
                                          break;
                                       case 'completed':
                                          statusColor = 'text-green-500 bg-green-500';
                                          break;
                                       case 'cancelled':
                                          statusColor = 'text-red-500 bg-red-500';
                                          break;
                                       case 'review':
                                          statusColor = 'text-purple-500 bg-purple-500';
                                          break;
                                       default:
                                          statusColor = 'text-gray-400 bg-gray-400';
                                    }

                                    return (
                                       <span className={`px-3 py-1 bg-opacity-20 rounded-full text-xs font-medium ${statusColor}`}>
                                          {statusText ? statusText.charAt(0).toUpperCase() + statusText.slice(1).replace('_', ' ') : 'Unknown'}
                                       </span>
                                    );
                                 })()}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center space-x-2">
                                    {order.status === 'pending' && (
                                       <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition">Accept</button>
                                    )}
                                    <button className="bg-dark-accent hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition">View Details</button>
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                              <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-50"></i>
                              <p>No orders found matching your filters</p>
                           </td>
                        </tr>
                     )}
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
