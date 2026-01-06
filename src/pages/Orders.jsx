import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { useCompanyStore } from '../store/company.store';
import { useProjectStore } from '../store/project.store';
import { usePaymentStore } from '../store/payment.store';
import { useAuthStore } from '../store/auth.store';

const Orders = () => {
   const [statusFilter, setStatusFilter] = useState('All Statuses');
   const [dateFilter, setDateFilter] = useState('All Time');
   const [amountFilter, setAmountFilter] = useState('All Amounts');
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedOrder, setSelectedOrder] = useState(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isEditMode, setIsEditMode] = useState(false);
   const [isCreateMode, setIsCreateMode] = useState(false);

   // Form state
   const [formData, setFormData] = useState({
      title: '',
      description: '',
      budget: '',
      status: 'pending',
      clientName: '',
      clientUsername: '',
      selectedCompanyId: ''
   });

   const { user } = useAuthStore();
   const { companies, getCompanies } = useCompanyStore();
   const { projects, getProjectsByCompany, createProject, updateProject, deleteProject, isLoading } = useProjectStore();
   const { payments, getPaymentsByCompany } = usePaymentStore();

   const isSuperAdmin = user?.data?.user?.role === 'super_admin';
   const currentCompanyId = companies?.data?.companies?.[0]?._id;

   // Получаем список компаний в зависимости от структуры данных
   const allCompanies = companies?.data?.companies || companies?.companies || [];

   useEffect(() => {
      if (isSuperAdmin) {
         console.log('Loading all companies for super_admin...');
         getCompanies();
      }
   }, [isSuperAdmin, getCompanies]);

   useEffect(() => {
      console.log('Companies data:', companies);
      console.log('All companies:', allCompanies);
      console.log('Is super admin:', isSuperAdmin);
   }, [companies, allCompanies, isSuperAdmin]);

   useEffect(() => {
      if (currentCompanyId && !isSuperAdmin) {
         getProjectsByCompany(currentCompanyId);
         getPaymentsByCompany(currentCompanyId);
      }
   }, [currentCompanyId, isSuperAdmin, getProjectsByCompany, getPaymentsByCompany]);

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

   const projectsList = projects?.data?.projects || [];
   const paymentsList = payments?.data?.payments || [];

   const filteredOrders = useMemo(() => {
      let result = [...projectsList];

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

   const pendingOrders = useMemo(() => getPendingOrders(projectsList), [projectsList]);
   const inProgressOrders = useMemo(() => getInProgressOrders(projectsList), [projectsList]);
   const completedOrders = useMemo(() => getCompletedOrders(projectsList), [projectsList]);
   const cancelledOrders = useMemo(() => getCancelledOrders(projectsList), [projectsList]);

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


   const handleSubmit = async (e) => {
      e.preventDefault();

      try {
         if (isCreateMode) {
            // Обязательные поля для создания
            if (!formData.title || !formData.budget) {
               alert('Title and Budget are required!');
               return;
            }

            const createData = {
               title: formData.title,
               description: formData.description || '',
               budget: parseFloat(formData.budget),
               client: (formData.clientName || formData.clientUsername)
                  ? {
                     name: formData.clientName || '',
                     username: formData.clientUsername || ''
                  }
                  : undefined,
               priority: 'medium', // как по умолчанию на бэкенде
               source: 'manual',
               // Для super_admin передаём companyId, для обычного пользователя — нет (бэкенд сам возьмёт из req.user.company)
               ...(isSuperAdmin && formData.selectedCompanyId && { companyId: formData.selectedCompanyId })
            };

            await createProject(createData);
            alert('Order created successfully!');

            // Обновляем список проектов
            if (!isSuperAdmin && currentCompanyId) {
               getProjectsByCompany(currentCompanyId);
            } else if (isSuperAdmin && formData.selectedCompanyId) {
               // Если super_admin создал для конкретной компании — можно обновить, но обычно список общий
               getProjectsByCompany(formData.selectedCompanyId); // опционально
            }

            closeModal();
         }
         else if (isEditMode && selectedOrder) {
            if (!formData.title || !formData.budget) {
               alert('Title and Budget are required!');
               return;
            }

            const updateData = {
               title: formData.title,
               description: formData.description || '',
               budget: parseFloat(formData.budget),
               status: formData.status,
               priority: 'medium', // можно добавить поле в форму, если нужно менять
               source: 'manual',
               client: (formData.clientName || formData.clientUsername)
                  ? {
                     name: formData.clientName || '',
                     username: formData.clientUsername || ''
                  }
                  : undefined
            };

            await updateProject(selectedOrder._id, updateData);
            alert('Order updated successfully!');

            if (currentCompanyId && !isSuperAdmin) {
               getProjectsByCompany(currentCompanyId);
            }

            closeModal();
         }
      } catch (error) {
         console.error('Error saving order:', error);
         alert('Failed to save order: ' + (error.response?.data?.message || error.message));
      }
   };

   // Исправлены опечатки в onChange
   const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
         ...prev,
         [name]: value
      }));
   };

   const resetForm = () => {
      setFormData({
         title: '',
         description: '',
         budget: '',
         status: 'pending',
         clientName: '',
         clientUsername: '',
         selectedCompanyId: ''
      });
   };

   const handleCreateOrder = () => {
      setIsCreateMode(true);
      setIsEditMode(false);
      resetForm();
      setIsModalOpen(true);
   };

   const handleEditOrder = (e, order) => {
      e.stopPropagation();
      setSelectedOrder(order);
      setIsEditMode(true);
      setIsCreateMode(false);
      setFormData({
         title: order.title || '',
         description: order.description || '',
         budget: order.budget || '',
         status: order.status || 'pending',
         clientName: order.client?.name || '',
         clientUsername: order.client?.username || '',
         selectedCompanyId: order.company?._id || order.company || ''
      });
      setIsModalOpen(true);
   };

   const handleDeleteOrder = async (e, orderId) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this order?')) {
         try {
            await deleteProject(orderId);
            alert('Order deleted successfully!');
            if (currentCompanyId && !isSuperAdmin) {
               getProjectsByCompany(currentCompanyId);
            }
         } catch (error) {
            console.error('Error deleting order:', error);
            alert('Failed to delete order. Please try again.');
         }
      }
   };

   const handleAccept = async (e, orderId) => {
      e.stopPropagation();
      try {
         await updateProject(orderId, { status: 'in_progress' });
         alert('Order accepted successfully!');
         if (currentCompanyId && !isSuperAdmin) {
            getProjectsByCompany(currentCompanyId);
         }
         closeModal();
      } catch (error) {
         console.error('Error accepting order:', error);
         alert('Failed to accept order. Please try again.');
      }
   };

   const handleViewDetails = (e, order) => {
      e.stopPropagation();
      setSelectedOrder(order);
      setIsEditMode(false);
      setIsCreateMode(false);
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedOrder(null);
      setIsEditMode(false);
      setIsCreateMode(false);
      resetForm();
   };


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
                  <button
                     onClick={handleCreateOrder}
                     className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
                  >
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
                                       <button
                                          onClick={(e) => handleAccept(e, order._id)}
                                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                       >
                                          Accept
                                       </button>
                                    )}
                                    <button
                                       onClick={(e) => handleViewDetails(e, order)}
                                       className="bg-dark-accent hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                    >
                                       View
                                    </button>
                                    <button
                                       onClick={(e) => handleEditOrder(e, order)}
                                       className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                    >
                                       Edit
                                    </button>
                                    <button
                                       onClick={(e) => handleDeleteOrder(e, order._id)}
                                       className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                    >
                                       Delete
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
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
            </div>
         </div>

         {/* Modal for View/Create/Edit */}
         {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
               <div className="bg-dark-secondary border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-dark-tertiary">
                     <h2 className="text-xl font-bold text-white">
                        {isCreateMode ? 'Create New Order' : isEditMode ? 'Edit Order' : 'Order Details'}
                     </h2>
                     <button onClick={closeModal} className="text-gray-400 hover:text-white transition">
                        <i className="fa-solid fa-times text-xl"></i>
                     </button>
                  </div>

                  <div className="p-6">
                     {(isCreateMode || isEditMode) ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                           {/* Company Selector - Only for super_admin in create mode */}
                           {isCreateMode && isSuperAdmin && (
                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">
                                    Company <span className="text-red-500">*</span>
                                 </label>
                                 <select
                                    name="selectedCompanyId"
                                    value={formData.selectedCompanyId}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                                    required
                                 >
                                    <option value="">Select a company ({allCompanies.length} available)</option>
                                    {allCompanies.map((company) => (
                                       <option key={company._id} value={company._id}>
                                          {company.name || company.title || `Company ${company._id}`}
                                       </option>
                                    ))}
                                 </select>
                              </div>
                           )}

                           {/* Show company info for non-super_admin in create mode */}
                           {isCreateMode && !isSuperAdmin && (
                              <div className="bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg p-4">
                                 <div className="flex items-start space-x-3">
                                    <i className="fa-solid fa-info-circle text-blue-500 text-lg mt-0.5"></i>
                                    <div>
                                       <p className="text-blue-400 text-sm font-medium mb-1">
                                          Creating order for your company
                                       </p>
                                       <p className="text-blue-300 text-xs">
                                          Company: {allCompanies[0]?.name || 'Your Company'}
                                       </p>
                                    </div>
                                 </div>
                              </div>
                           )}

                           <div>
                              <label className="text-sm font-medium text-gray-300 block mb-2">
                                 Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                 type="text"
                                 name="title"
                                 value={formData.title}
                                 onChange={handleInputChange}
                                 className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                                 placeholder="Enter order title"
                                 required
                              />
                           </div>

                           <div>
                              <label className="text-sm font-medium text-gray-300 block mb-2">
                                 Description
                              </label>
                              <textarea
                                 name="description"
                                 value={formData.description}
                                 onChange={handleInputChange}
                                 rows="4"
                                 className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                                 placeholder="Enter order description"
                              />
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">
                                    Budget <span className="text-red-500">*</span>
                                 </label>
                                 <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    required
                                 />
                              </div>

                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">
                                    Status
                                 </label>
                                 <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                                 >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="review">Review</option>
                                    <option value="revision">Revision</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                 </select>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">
                                    Client Name
                                 </label>
                                 <input
                                    type="text"
                                    name="clientName"
                                    value={formData.clientName}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                                    placeholder="Enter client name"
                                 />
                              </div>

                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">
                                    Client Username
                                 </label>
                                 <input
                                    type="text"
                                    name="clientUsername"
                                    value={formData.clientUsername}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                                    placeholder="@username"
                                 />
                              </div>
                           </div>

                           <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                              <button
                                 type="button"
                                 onClick={closeModal}
                                 className="bg-dark-tertiary hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
                              >
                                 Cancel
                              </button>
                              <button
                                 type="submit"
                                 className="bg-dark-accent hover:bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
                              >
                                 {isEditMode ? 'Update Order' : 'Create Order'}
                              </button>
                           </div>
                        </form>
                     ) : (
                        <div className="space-y-6">
                           <div className="flex flex-col sm:flex-row justify-between gap-4">
                              <div>
                                 <span className="text-xs text-gray-500 block mb-1">Order ID</span>
                                 <span className="text-white font-mono bg-dark-tertiary px-2 py-1 rounded text-sm">
                                    #{selectedOrder._id}
                                 </span>
                              </div>
                              <div>
                                 <span className="text-xs text-gray-500 block mb-1">Status</span>
                                 <span className={`px-3 py-1 bg-opacity-20 rounded-full text-xs font-medium inline-block
                                    ${selectedOrder.status === 'pending' ? 'text-yellow-500 bg-yellow-500' :
                                       selectedOrder.status === 'completed' ? 'text-green-500 bg-green-500' :
                                          selectedOrder.status === 'cancelled' ? 'text-red-500 bg-red-500' : 'text-blue-500 bg-blue-500'}`}>
                                    {selectedOrder.status.toUpperCase().replace('_', ' ')}
                                 </span>
                              </div>
                           </div>

                           <div>
                              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Project Info</h3>
                              <div className="bg-dark-tertiary rounded-lg p-4 space-y-3">
                                 <div>
                                    <span className="text-xs text-gray-500 block">Title</span>
                                    <p className="text-white font-medium">{selectedOrder.title || 'No Title'}</p>
                                 </div>
                                 <div>
                                    <span className="text-xs text-gray-500 block">Description</span>
                                    <p className="text-gray-300 text-sm">{selectedOrder.description || 'No Description'}</p>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <span className="text-xs text-gray-500 block">Budget/Amount</span>
                                       <p className="text-white font-semibold">${(selectedOrder.budget || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                       <span className="text-xs text-gray-500 block">Date</span>
                                       <p className="text-white text-sm">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div>
                              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Client Info</h3>
                              <div className="bg-dark-tertiary rounded-lg p-4 flex items-center space-x-4">
                                 <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg text-white font-bold">
                                    {selectedOrder.client?.name ? selectedOrder.client.name.charAt(0).toUpperCase() : '?'}
                                 </div>
                                 <div>
                                    <p className="text-white font-medium">{selectedOrder.client?.name || 'Unknown Client'}</p>
                                    <p className="text-gray-500 text-sm">{selectedOrder.client?.username || 'No username'}</p>
                                    <p className="text-gray-500 text-xs mt-1">ID: {selectedOrder.client?._id}</p>
                                 </div>
                              </div>
                           </div>

                           <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                              <button
                                 onClick={(e) => handleEditOrder(e, selectedOrder)}
                                 className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
                              >
                                 <i className="fa-solid fa-edit"></i>
                                 <span>Edit Order</span>
                              </button>
                              {selectedOrder.status === 'pending' && (
                                 <button
                                    onClick={(e) => handleAccept(e, selectedOrder._id)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
                                 >
                                    <i className="fa-solid fa-check"></i>
                                    <span>Accept Order</span>
                                 </button>
                              )}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Orders;