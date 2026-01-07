/* eslint-disable no-unused-vars */
/* eslint-disable no-unsafe-optional-chaining */
import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth.store';
import { usePaymentStore } from '../store/payment.store';
import { useCompanyStore } from '../store/company.store';
import { useUserStore } from '../store/user.store';
import PageLoader from '../components/loader/PageLoader';

const Payments = () => {
   const [projectAmount, setProjectAmount] = useState(10000);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [statusFilter, setStatusFilter] = useState('All Statuses');
   const [viewCompanyId, setViewCompanyId] = useState('all');
   const [timePeriod, setTimePeriod] = useState('6m');
   const [searchQuery, setSearchQuery] = useState('');

   const { user } = useAuthStore();
   const { companies, selectedCompany, getCompanies, getCompanyById } = useCompanyStore();
   const { users, getAllUsers, getUsersByCompany } = useUserStore();
   const { payments, getAllPayments, getPaymentsByCompany, confirmPayment, completePayment, updatePayment, isLoading } = usePaymentStore();

   const userData = useMemo(() => user?.data?.user || user?.user || user, [user]);
   const isSuperAdmin = useMemo(() => userData?.role === 'super_admin', [userData]);

   const allCompanies = useMemo(() => {
      const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);
      return companyList;
   }, [companies]);

   const allTeams = useMemo(() => {
      if (!userData) return [];
      const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);
      const userCompanyId = String(userData.company?._id || userData.company || '');

      let relevantCompanies = [...companyList];
      const selComp = selectedCompany?.company || selectedCompany?.data?.company || selectedCompany;

      if (selComp && String(selComp._id) === userCompanyId) {
         if (!relevantCompanies.some(c => String(c._id) === userCompanyId)) {
            relevantCompanies.push(selComp);
         } else {
            relevantCompanies = relevantCompanies.map(c => String(c._id) === userCompanyId ? selComp : c);
         }
      }

      if (isSuperAdmin) {
         let teams = [];
         relevantCompanies.forEach(c => {
            if (c.teams) teams = [...teams, ...c.teams.map(t => ({ ...t, companyName: c.name, companyId: String(c._id) }))];
         });
         return teams;
      } else {
         const company = relevantCompanies.find(c => String(c._id) === userCompanyId);
         const companyTeams = company?.teams?.map(t => ({ ...t, companyName: company.name, companyId: String(company._id) })) || [];

         if (userData?.role === 'company_admin') {
            return companyTeams;
         }

         const currentUserId = String(userData?._id || userData?.id || '');
         return companyTeams.filter(t => {
            const teamLeadId = String(t.teamLead?._id || t.teamLead || '');
            const isLead = teamLeadId && teamLeadId === currentUserId;
            const isMember = t.members?.some(m => {
               const mId = String(m?._id || m.user?._id || m.user || m || '');
               return mId && mId === currentUserId;
            });
            return isLead || isMember;
         });
      }
   }, [companies, selectedCompany, userData, isSuperAdmin]);

   const activeCompanyId = useMemo(() => {
      if (isSuperAdmin) return viewCompanyId;
      return userData?.company?._id || userData?.company?.id || userData?.company || '';
   }, [isSuperAdmin, viewCompanyId, userData]);

   useEffect(() => {
      if (isSuperAdmin) {
         getCompanies();
      } else if (activeCompanyId) {
         getCompanyById(activeCompanyId);
      }
   }, [isSuperAdmin, getCompanies, getCompanyById, activeCompanyId]);

   const fetchData = async () => {
      try {
         if (isSuperAdmin && viewCompanyId === 'all') {
            if (allCompanies.length > 0) {
               const ids = allCompanies.map(c => c._id);
               await Promise.all([
                  getAllPayments(ids),
                  getAllUsers(ids)
               ]);
            } else {
               // If no companies exist for super admin and 'all' is selected, fetch nothing or handle appropriately
               // For now, we'll just ensure payments are cleared if no companies are found
               // This might need adjustment based on exact backend behavior for 'all' payments
               await getAllPayments([]); // Pass an empty array to clear payments if no companies
            }
         } else if (activeCompanyId && activeCompanyId !== 'all') {
            await Promise.all([
               getPaymentsByCompany(activeCompanyId),
               getUsersByCompany(activeCompanyId)
            ]);
         } else if (!isSuperAdmin && !activeCompanyId) {
            // Non-super admin with no company assigned
            // This case should ideally not happen if user always has a company, but good for robustness
            await getPaymentsByCompany(null); // Or handle as no payments
         }
      } catch (error) {
         console.error('Error fetching payments:', error);
         toast.error('Failed to load payments', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      }
   };

   useEffect(() => {
      fetchData();
   }, [activeCompanyId, viewCompanyId, isSuperAdmin, allCompanies.length]);

   const paymentsList = useMemo(() => {
      const list = payments?.data?.payments || payments?.payments || (Array.isArray(payments) ? payments : []);

      // Role-based filtering
      let result = [...list];
      if (!isSuperAdmin && userData?.role !== 'company_admin') {
         const currentUserId = String(userData?._id || userData?.id || '');

         if (userData?.role === 'team_lead') {
            // Team leads see payments related to teams they lead or belong to
            const myTeams = allTeams;
            const myTeamIds = new Set(myTeams.map(t => String(t._id || t.id || '')));

            result = result.filter(p => {
               const projectTeamId = String(p.project?.team?._id || p.project?.team || '');
               return projectTeamId && myTeamIds.has(projectTeamId);
            });
         } else {
            // Other roles (backend, frontend, marketer, designer, employee) 
            // see only payments for projects they are directly assigned to
            result = result.filter(p => {
               const isAssigned = p.project?.assignedMembers?.some(m => {
                  const mId = String(m.user?._id || m.user || m || '');
                  return mId && mId === currentUserId;
               });
               return isAssigned;
            });
         }
      }

      return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
   }, [payments, isSuperAdmin, userData, allTeams]);


   const filteredPayments = useMemo(() => {
      let result = [...paymentsList];
      if (statusFilter !== 'All Statuses') {
         result = result.filter(p => p.status === statusFilter.toLowerCase());
      }
      if (searchQuery) {
         const q = searchQuery.toLowerCase();
         result = result.filter(p => {
            const amount = (Number(p.totalAmount) || Number(p.amount) || 0).toString();
            const description = (p.description || '').toLowerCase();
            const clientName = (typeof p.client === 'object' ? p.client?.name : '').toLowerCase();
            const projectId = (p._id || '').toLowerCase();
            return amount.includes(q) || description.includes(q) || clientName.includes(q) || projectId.includes(q);
         });
      }
      return result;
   }, [paymentsList, statusFilter, searchQuery]);

   // Statistics Calculation
   const stats = useMemo(() => {
      const totalRevenue = paymentsList.reduce((sum, p) => sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0);
      const pendingPayments = paymentsList.filter(p => p.status === 'pending');
      const pendingAmount = pendingPayments.reduce((sum, p) => sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0);

      const now = new Date();
      const thisMonthPayments = paymentsList.filter(p => {
         const d = new Date(p.createdAt);
         return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0);

      const teamPayouts = totalRevenue * 0.70; // 70% rule

      return { totalRevenue, pendingAmount, pendingCount: pendingPayments.length, thisMonthAmount, teamPayouts };
   }, [paymentsList]);


   const distributionData = [{
      type: 'pie',
      labels: ['Team Members (70%)', 'Admin (10%)', 'Company (20%)'],
      values: [stats.totalRevenue * 0.7, stats.totalRevenue * 0.1, stats.totalRevenue * 0.2],
      marker: {
         colors: ['#10B981', '#FF0000', '#3B82F6', '#F59E0B']
      },
      textinfo: 'label+value',
      textfont: { color: '#FFFFFF', size: 10 },
      hovertemplate: '%{label}: $%{value}<extra></extra>'
   }];

   const distributionLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   // Dynamic Revenue Trend logic
   const revenueTrend = useMemo(() => {
      const map = {};
      const now = new Date();
      const months = [];

      const count = timePeriod === '6m' ? 6 : timePeriod === '1y' ? 12 : 24;

      for (let i = count - 1; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         const label = d.toLocaleString('en', { month: 'short' });
         const key = `${d.getFullYear()}-${d.getMonth()}`;
         months.push({ label, key });
         map[key] = 0;
      }

      paymentsList.forEach(p => {
         const d = new Date(p.createdAt);
         const key = `${d.getFullYear()}-${d.getMonth()}`;
         if (map[key] !== undefined) {
            map[key] += (Number(p.totalAmount) || Number(p.amount) || 0);
         }
      });

      return {
         labels: months.map(m => m.label),
         values: months.map(m => map[m.key])
      };
   }, [paymentsList, timePeriod]);

   const revenueData = [{
      type: 'scatter',
      mode: 'lines+markers',
      x: revenueTrend.labels,
      y: revenueTrend.values,
      line: { color: '#10B981', width: 3, shape: 'spline' },
      marker: { size: 6, color: '#10B981' },
      fill: 'tozeroy',
      fillcolor: 'rgba(16, 185, 129, 0.1)'
   }];
   const revenueLayout = {
      autosize: true,
      xaxis: { gridcolor: '#2A2A2A', color: '#9CA3AF' },
      yaxis: {
         gridcolor: '#2A2A2A',
         color: '#9CA3AF',
         tickformat: '$,.0f'
      },
      margin: { t: 20, r: 20, b: 40, l: 60 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   const handleConfirm = async (id) => {
      setIsSubmitting(true);
      try {
         await confirmPayment(id);
         toast.success('Payment confirmed successfully!', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
         fetchData(); // Re-fetch data to update the list
      } catch (error) {
         console.error(error);
         toast.error('Failed to confirm payment', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleComplete = async (id) => {
      setIsSubmitting(true);
      try {
         await completePayment(id);
         toast.success('Payment marked as paid!', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
         fetchData(); // Re-fetch data to update the list
      } catch (error) {
         console.error(error);
         toast.error('Failed to complete payment', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      } finally {
         setIsSubmitting(false);
      }
   };

   if (isLoading && paymentsList.length === 0) return <PageLoader />;

   return (
      <div className="p-8 space-y-8">
         <div id="payments-header-section">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Payment Management</h1>
                  <p className="text-gray-400">Confirm payments and manage automatic salary distribution</p>
               </div>
               <div className="flex flex-wrap items-center gap-3">
                  {isSuperAdmin && (
                     <select
                        className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-dark-accent"
                        value={viewCompanyId}
                        onChange={(e) => setViewCompanyId(e.target.value)}
                     >
                        <option value="all">All Companies</option>
                        {allCompanies.map(c => (
                           <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                     </select>
                  )}
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-download"></i>
                     <span>Export Report</span>
                  </button>
               </div>
            </div>
         </div>

         <div id="payments-stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-green-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-dollar-sign text-green-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Total Revenue</h3>
               <p className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
               <p className="text-xs text-gray-500 mt-1">All time earnings</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-yellow-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-clock text-yellow-500 text-xl"></i>
                  </div>
                  <span className="text-xs text-yellow-500 font-medium">{stats.pendingCount} pending</span>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Pending Payments</h3>
               <p className="text-2xl font-bold text-white">${stats.pendingAmount.toLocaleString()}</p>
               <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-blue-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-calendar text-blue-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">This Month</h3>
               <p className="text-2xl font-bold text-white">${stats.thisMonthAmount.toLocaleString()}</p>
               <p className="text-xs text-gray-500 mt-1">Current Month</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-purple-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-users text-purple-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Team Payouts</h3>
               <p className="text-2xl font-bold text-white">${stats.teamPayouts.toLocaleString()}</p>
               <p className="text-xs text-gray-500 mt-1">70% of revenue</p>
            </div>
         </div>

         <div id="payment-distribution-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">Payment Distribution Calculator</h3>
                     <p className="text-sm text-gray-400">Automatic salary split based on project revenue</p>
                  </div>
               </div>

               <div className="bg-dark-tertiary rounded-lg p-5 mb-6 border border-gray-700">
                  <label className="text-sm text-gray-400 mb-2 block">Calculator Amount ($)</label>
                  <input type="number" value={projectAmount} onChange={(e) => setProjectAmount(Number(e.target.value))} className="w-full bg-dark-secondary border border-gray-700 rounded-lg px-4 py-3 text-white text-xl font-semibold focus:outline-none focus:border-dark-accent" id="project-amount" />
               </div>

               <div className="space-y-4">
                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-dark-accent transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-dark-accent bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-user-shield text-dark-accent"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">Main Admin</p>
                              <p className="text-xs text-gray-400">10% of total</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * 0.10).toLocaleString()}</p>
                           <p className="text-xs text-dark-accent">10%</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-user-tie text-blue-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">Admin</p>
                              <p className="text-xs text-gray-400">10% of total</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * 0.10).toLocaleString()}</p>
                           <p className="text-xs text-blue-500">10%</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-yellow-500 transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-building text-yellow-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">Company</p>
                              <p className="text-xs text-gray-400">10% of total</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * 0.10).toLocaleString()}</p>
                           <p className="text-xs text-yellow-500">10%</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-green-500 transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-users text-green-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">Team Members</p>
                              <p className="text-xs text-gray-400">70% divided by contribution</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * 0.70).toLocaleString()}</p>
                           <p className="text-xs text-green-500">70%</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Distribution Chart</h3>
                  <p className="text-sm text-gray-400">Visual breakdown</p>
               </div>
               <div className="w-full h-[350px]">
                  <Plot
                     data={distributionData}
                     layout={distributionLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>
         </div>

         <div id="pending-payments-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
               <div>
                  <h3 className="text-lg font-semibold text-white mb-1">All Payments</h3>
                  <p className="text-sm text-gray-400">Manage all transactions</p>
               </div>
               <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                     <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                     <input
                        type="text"
                        placeholder="Search payments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-dark-tertiary border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent"
                     />
                  </div>
                  <select
                     className="bg-dark-tertiary border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-dark-accent"
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                  >
                     <option>All Statuses</option>
                     <option value="pending">Pending</option>
                     <option value="confirmed">Confirmed</option>
                     <option value="completed">Completed</option>
                  </select>
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full min-w-[800px]">
                  <thead>
                     <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Description</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Client</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Method</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Action</th>
                     </tr>
                  </thead>
                  <tbody>
                     {filteredPayments.length > 0 ? (
                        filteredPayments.map(payment => (
                           <tr key={payment._id} className="border-b border-gray-800 hover:bg-dark-tertiary transition">
                              <td className="py-4 px-4">
                                 <p className="text-sm text-white">{new Date(payment.createdAt).toLocaleDateString()}</p>
                                 <p className="text-xs text-gray-400">{new Date(payment.createdAt).toLocaleTimeString()}</p>
                              </td>
                              <td className="py-4 px-4">
                                 <p className="text-sm text-white font-medium">{payment.description || 'No Description'}</p>
                                 <p className="text-xs text-gray-400">ID: {payment._id.slice(-8)}</p>
                              </td>
                              <td className="py-4 px-4">
                                 <div className="flex items-center space-x-2">
                                    {(() => {
                                       const usersList = users?.data?.users || (Array.isArray(users) ? users : []);
                                       // Поиск ID клиента: сначала из поля client, затем из создателя проекта
                                       const clientRef = payment.client?._id || payment.client || payment.project?.createdBy?._id || payment.project?.createdBy;
                                       const clientId = String(clientRef || '');

                                       const clientData = usersList.find(u => String(u._id) === clientId);
                                       const name = clientData?.name || (typeof payment.client === 'object' ? payment.client?.name : null) || (typeof payment.project?.createdBy === 'object' ? payment.project?.createdBy?.name : null) || 'Unknown';

                                       return (
                                          <>
                                             <div className="w-8 h-8 rounded-full bg-dark-accent/20 flex items-center justify-center text-[10px] text-dark-accent font-bold border border-dark-accent/10">
                                                {name.charAt(0).toUpperCase()}
                                             </div>
                                             <div>
                                                <p className="text-sm text-white font-medium">{name}</p>
                                                {clientData?.email && <p className="text-[10px] text-gray-500">{clientData.email}</p>}
                                             </div>
                                          </>
                                       );
                                    })()}
                                 </div>
                              </td>
                              <td className="py-4 px-4"><p className="text-sm text-white font-semibold">${(Number(payment.totalAmount) || Number(payment.amount) || 0).toLocaleString()}</p></td>
                              <td className="py-4 px-4">
                                 <div className="flex items-center space-x-2">
                                    <select
                                       value={payment.paymentMethod || 'bank_transfer'}
                                       disabled={payment.status !== 'pending' || isSubmitting}
                                       onChange={async (e) => {
                                          const newVal = e.target.value;
                                          try {
                                             await updatePayment(payment._id, { paymentMethod: newVal });
                                             toast.success(`Method updated to ${newVal}`, {
                                                position: 'top-right',
                                                autoClose: 5000,
                                                closeOnClick: false,
                                                draggable: false,
                                                theme: 'dark',
                                             });
                                          } catch (err) {
                                             toast.error('Update failed', {
                                                position: 'top-right',
                                                autoClose: 5000,
                                                closeOnClick: false,
                                                draggable: false,
                                                theme: 'dark',
                                             });
                                          }
                                       }}
                                       className="bg-dark-secondary text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 focus:outline-none focus:border-dark-accent disabled:opacity-50"
                                    >
                                       <option value="bank_transfer">Bank Transfer</option>
                                       <option value="cash">Cash</option>
                                       <option value="card">Card</option>
                                       <option value="paypal">PayPal</option>
                                       <option value="crypto">Crypto</option>
                                       <option value="other">Other</option>
                                    </select>
                                 </div>
                              </td>
                              <td className="py-4 px-4">
                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit tracking-wider
                                         ${payment.status === 'pending' ? 'bg-yellow-500 bg-opacity-20 text-yellow-500' :
                                       payment.status === 'completed' ? 'bg-green-500 bg-opacity-20 text-green-500' :
                                          payment.status === 'confirmed' ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
                                             'bg-gray-500 bg-opacity-20 text-gray-500'}`}>
                                    {payment.status}
                                 </span>
                              </td>
                              <td className="py-4 px-4">
                                 <div className="flex items-center gap-2">
                                    {payment.status === 'pending' ? (
                                       <button
                                          onClick={() => handleConfirm(payment._id)}
                                          disabled={isSubmitting}
                                          className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
                                          title="Confirm Receipt"
                                       >
                                          <i className="fa-solid fa-check"></i>
                                          Confirm
                                       </button>
                                    ) : payment.status === 'confirmed' && isSuperAdmin ? (
                                       <button
                                          onClick={() => handleComplete(payment._id)}
                                          disabled={isSubmitting}
                                          className="bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
                                          title="Mark as Paid to Team"
                                       >
                                          <i className="fa-solid fa-flag-checkered"></i>
                                          Complete
                                       </button>
                                    ) : (
                                       <span className="text-xs text-gray-500 italic px-2">No actions</span>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="7" className="text-center py-8 text-gray-500">No payments found</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         <div id="payment-history-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Recent Completed</h3>
                  <p className="text-sm text-gray-400">Latest finished transactions</p>
               </div>
               <div className="space-y-3">
                  {paymentsList.filter(p => p.status === 'completed').slice(0, 5).map(payment => (
                     <div key={payment._id} className="flex items-center justify-between p-4 bg-dark-tertiary rounded-lg border border-gray-700 hover:border-green-500 transition">
                        <div className="flex items-center space-x-4">
                           <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-check text-green-500"></i>
                           </div>
                           <div>
                              <p className="text-sm text-white font-medium">{payment.description || 'Payment'}</p>
                              <p className="text-xs text-gray-400">Confirmed on {new Date(payment.updatedAt || payment.createdAt).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-sm text-white font-semibold">${(Number(payment.totalAmount) || Number(payment.amount) || 0).toLocaleString()}</p>
                           <p className="text-xs text-green-500">Distributed</p>
                        </div>
                     </div>
                  ))}
                  {paymentsList.filter(p => p.status === 'completed').length === 0 && (
                     <p className="text-gray-500 text-center py-4">No completed payments yet.</p>
                  )}
               </div>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">Revenue Trends</h3>
                     <p className="text-sm text-gray-400">Past performance</p>
                  </div>
                  <select
                     value={timePeriod}
                     onChange={(e) => setTimePeriod(e.target.value)}
                     className="bg-dark-tertiary border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-dark-accent"
                  >
                     <option value="6m">Last 6 Months</option>
                     <option value="1y">Last Year</option>
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
         </div>
      </div>
   );
};

export default Payments;
