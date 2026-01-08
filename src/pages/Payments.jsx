/* eslint-disable no-unused-vars */
/* eslint-disable no-unsafe-optional-chaining */
import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth.store';
import { usePaymentStore } from '../store/payment.store';
import { useCompanyStore } from '../store/company.store';
import { useUserStore } from '../store/user.store';
import { useProjectStore } from '../store/project.store';
import { useTaskStore } from '../store/task.store';
import PageLoader from '../components/loader/PageLoader';
import { useTranslation } from 'react-i18next';

const Payments = () => {
   const { t } = useTranslation();
   const [projectAmount, setProjectAmount] = useState(10000);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [statusFilter, setStatusFilter] = useState('all');
   const [viewCompanyId, setViewCompanyId] = useState('all');
   const [timePeriod, setTimePeriod] = useState('6m');
   const [searchQuery, setSearchQuery] = useState('');

   const { user } = useAuthStore();
   const { companies, selectedCompany, getCompanies, getCompanyById } = useCompanyStore();
   const { users, getAllUsers, getUsersByCompany } = useUserStore();
   const { payments, getAllPayments, getPaymentsByCompany, getPaymentsByUser, confirmPayment, completePayment, updatePayment, exportPaymentHistory, isLoading } = usePaymentStore();
   const { projects, getProjectsByCompany } = useProjectStore(); // Added getProjectsByCompany
   const { tasks, getTasksByProjects, getTasksByUser } = useTaskStore(); // Added getTasksByUser

   const userData = useMemo(() => user?.data?.user || user?.user || user, [user]);
   const isSuperAdmin = useMemo(() => userData?.role === 'super_admin', [userData]);

   const distributionRates = useMemo(() => {
      const comp = selectedCompany?.company || selectedCompany?.data?.company || selectedCompany || {};
      const rates = comp.distributionRates || {};
      return {
         admin: Number(rates.customAdminRate || rates.adminRate || 10) / 100,
         team: Number(rates.customTeamRate || rates.teamRate || 70) / 100,
         company: Number(rates.customCommissionRate || rates.companyRate || 20) / 100
      };
   }, [selectedCompany]);

   const allCompanies = useMemo(() => companies?.data?.companies || (Array.isArray(companies) ? companies : []), [companies]);
   const activeCompanyId = useMemo(() => isSuperAdmin ? viewCompanyId : (userData?.company?._id || userData?.company || ''), [isSuperAdmin, viewCompanyId, userData]);

   useEffect(() => {
      getCompanies();
   }, [getCompanies]);

   useEffect(() => {
      fetchData();
   }, [activeCompanyId, viewCompanyId, isSuperAdmin, userData]);

   // Update fetchData to include task fetching
   const fetchData = async () => {
      try {
         let fetchedPayments = [];
         if (isSuperAdmin && viewCompanyId === 'all') {
            if (allCompanies.length > 0) {
               const ids = allCompanies.map(c => c._id);
               await Promise.all([
                  getAllPayments(ids),
                  getAllUsers(ids)
               ]);
            } else {
               await getAllPayments([]);
            }
         } else if (activeCompanyId && activeCompanyId !== 'all') {
            await Promise.all([
               getPaymentsByCompany(activeCompanyId),
               getUsersByCompany(activeCompanyId)
            ]);
         } else if (userData?._id || userData?.id) {
            const userId = userData._id || userData.id;
            const companyId = userData.company?._id || userData.company || '';
            // Team Lead: Needs visibility of Project Payouts (Client -> Company) to see revenue
            if (userData.role === 'team_lead') {
               const promises = [
                  getPaymentsByCompany(companyId),
                  getTasksByUser(userId)
               ];
               if (companyId) promises.push(getProjectsByCompany(companyId));
               await Promise.all(promises);
            } else {
               // Team Member: Fetch their own payments AND tasks AND company projects
               const promises = [
                  getPaymentsByUser(userId),
                  getTasksByUser(userId)
               ];
               if (companyId) promises.push(getProjectsByCompany(companyId));
               await Promise.all(promises);
            }
         }
      } catch (error) {
         console.error('Error fetching payments:', error);
         toast.error(t('failed_load_payments'));
      }
   };

   // Fetch tasks when payments change
   useEffect(() => {
      const fetchRelatedTasks = async () => {
         const list = payments?.data?.payments || payments?.payments || (Array.isArray(payments) ? payments : []);
         // Ensure we get string IDs and filter out any non-id objects
         const projectIds = [...new Set(list.map(p => {
            const id = p.project?._id || p.project?.id || p.project;
            return typeof id === 'string' ? id : (id?._id || id?.id || null);
         }).filter(Boolean))];

         if (projectIds.length > 0) {
            await getTasksByProjects(projectIds);
         }
      };

      if (payments) {
         fetchRelatedTasks();
      }
   }, [payments, getTasksByProjects]);

   const paymentsList = useMemo(() => {
      const list = payments?.data?.payments || payments?.payments || (Array.isArray(payments) ? payments : []);
      const currentUserId = String(userData?._id || userData?.id || '');

      // 1. Super Admin: Filter by viewCompanyId if not 'all'
      if (isSuperAdmin) {
         if (viewCompanyId === 'all') return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
         return list.filter(p => {
            const pCompId = String(p.company?._id || p.company || '');
            return pCompId === viewCompanyId;
         }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      // 2. Company Admin: Sees everything fetched
      if (userData?.role === 'company_admin') {
         const userCompanyId = String(userData.company?._id || userData.company || '');
         return list.filter(p => {
            const pCompId = String(p.company?._id || p.company || '');
            return pCompId === userCompanyId;
         }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      // 3. Team Lead
      if (userData?.role === 'team_lead') {
         return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      // 4. Team Member (Regular user)
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

   }, [payments, isSuperAdmin, userData, viewCompanyId]);

   const filteredPayments = useMemo(() => {
      let result = paymentsList;

      if (statusFilter !== 'all') {
         result = result.filter(p => p.status === statusFilter.toLowerCase());
      }


      if (searchQuery) {
         const query = searchQuery.toLowerCase();
         result = result.filter(p =>
            p.description?.toLowerCase().includes(query) ||
            String(p.totalAmount || p.amount || '').includes(query) ||
            (p.client?.name && p.client.name.toLowerCase().includes(query))
         );
      }

      if (timePeriod !== 'all') {
         const now = new Date();
         const past = new Date();
         if (timePeriod === '7d') past.setDate(now.getDate() - 7);
         if (timePeriod === '30d') past.setDate(now.getDate() - 30);
         if (timePeriod === '3m') past.setMonth(now.getMonth() - 3);
         if (timePeriod === '6m') past.setMonth(now.getMonth() - 6);
         if (timePeriod === '1y') past.setFullYear(now.getFullYear() - 1);

         result = result.filter(p => new Date(p.createdAt) >= past);
      }

      return result;
   }, [paymentsList, statusFilter, searchQuery, timePeriod]);

   // Helper to calculate My Share (moved up for use in stats)
   const calculateMyShare = React.useCallback((payment) => {
      if (!userData) return 0;
      const projectObj = payment.project || {};
      const projectId = String(projectObj._id || projectObj.id || projectObj || '');
      const currentUserId = String(userData._id || userData.id || '');

      // Identify Team Lead robustly
      const projectList = projects?.data?.projects || projects?.projects || (Array.isArray(projects) ? projects : []);
      const fullProject = projectList.find(p => String(p._id || p.id) === projectId) || projectObj;

      let teamLeadId = '';
      const teamRef = fullProject.team;

      // Case A: team is populated object
      if (teamRef && typeof teamRef === 'object' && (teamRef.teamLead || teamRef.teamLeadId)) {
         teamLeadId = String(teamRef.teamLead?._id || teamRef.teamLead || teamRef.teamLeadId || '');
      }
      // Case B: team is just ID, look it up in companies
      else if (teamRef) {
         const teamId = String(teamRef._id || teamRef);
         const allCompaniesList = companies?.data?.companies || companies || [];

         for (const comp of allCompaniesList) {
            const foundTeam = comp.teams?.find(t => String(t._id) === teamId);
            if (foundTeam?.teamLead) {
               teamLeadId = String(foundTeam.teamLead._id || foundTeam.teamLead);
               break;
            }
         }
      }
      // Case C: No team ref on project? Scan all companies for this project ID!
      else {
         const allCompaniesList = companies?.data?.companies || companies || [];
         // Scan all teams in all companies to see if this project belongs to one
         outerLoop:
         for (const comp of allCompaniesList) {
            if (comp.teams) {
               for (const t of comp.teams) {
                  // Project might be in t.projects (if populated) or we assume connection? 
                  // Actually, usually projects have 'team' field. 
                  // If project is missing 'team', maybe we can find the project in the team's project list?
                  if (t.projects && t.projects.some(p => String(p._id || p) === projectId)) {
                     if (t.teamLead) {
                        teamLeadId = String(t.teamLead._id || t.teamLead);
                        break outerLoop;
                     }
                  }
               }
            }
         }
      }

      const isLead = currentUserId === teamLeadId;

      // Debug log
      console.log('Calc Share:', { projectId, teamLeadId, currentUserId, isLead, teamRefType: typeof teamRef, projectListLen: projectList.length });

      // Robust task list retrieval
      const allTasks = Array.isArray(tasks) ? tasks : (tasks?.data?.tasks || tasks?.tasks || []);

      // 1. Find all completed tasks for this project
      const projectTasks = allTasks.filter(t =>
         String(t.project?._id || t.project?.id || t.project || '') === projectId &&
         t.status === 'completed'
      );

      const totalAmount = Number(payment.totalAmount) || Number(payment.amount) || 0;

      // Use dynamic rates: Team Share split into Execution (80%) and Lead Management (20%)
      const managementReward = totalAmount * distributionRates.team * 0.2;
      const executionPool = totalAmount * distributionRates.team * 0.8;

      // 2. Sum Total Weight for Execution Pool
      const totalWeight = projectTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);

      let share = 0;

      // Add Management Reward if Lead
      if (isLead) {
         share += managementReward;
      }

      // Add Execution Share if participated in tasks
      if (totalWeight > 0) {
         const myTasks = projectTasks.filter(t =>
            String(t.assignedTo?._id || t.assignedTo?.id || t.assignedTo || '') === currentUserId
         );
         const myWeight = myTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);
         share += (executionPool * (myWeight / totalWeight));
      }

      // 3. Add Admin Share if Company Admin
      if (userData.role === 'company_admin') {
         share += (totalAmount * distributionRates.admin);
      }

      // 4. Add Company Share if Super Admin - Optional view
      if (userData.role === 'super_admin') {
         share += (totalAmount * distributionRates.company);
      }

      return share;
   }, [userData, tasks, projects, distributionRates]);

   const stats = useMemo(() => {
      const activeList = filteredPayments;

      const totalRevenue = activeList.reduce((sum, p) => sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0);
      const pendingPayments = activeList.filter(p => p.status === 'pending');
      const pendingAmount = pendingPayments.reduce((sum, p) => sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0);
      const pendingCount = pendingPayments.length;

      const now = new Date();
      const thisMonthPayments = activeList.filter(p => {
         const d = new Date(p.createdAt);
         return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0);

      // Individual Earnings for Worker/Non-Admin (Confirmed + Completed)
      const myTotalEarnings = activeList.reduce((sum, p) => {
         if (p.status === 'completed' || p.status === 'confirmed') {
            return sum + calculateMyShare(p);
         }
         return sum;
      }, 0);

      // Calculate Estimated Share from Projects for non-admins
      const projectList = projects?.data?.projects || projects?.projects || (Array.isArray(projects) ? projects : []);
      const myEstimatedShare = !isSuperAdmin ? projectList.reduce((sum, proj) => {
         // Only look at non-completed projects for estimation
         if (proj.status === 'completed') return sum;

         // Mock a payment object for the share calculator
         const mockPayment = {
            project: proj,
            totalAmount: proj.budget || 0,
            status: 'pending'
         };
         return sum + calculateMyShare(mockPayment);
      }, 0) : 0;

      const teamPayouts = totalRevenue * distributionRates.team; // Total Team Share
      const leadManagementPool = totalRevenue * distributionRates.team * 0.2; // 20% of Team Share
      const executionPool = totalRevenue * distributionRates.team * 0.8; // 80% of Team Share

      return { totalRevenue, pendingAmount, pendingCount, thisMonthAmount, teamPayouts, myTotalEarnings, myEstimatedShare, leadManagementPool, executionPool };
   }, [filteredPayments, calculateMyShare, tasks, userData, projects, isSuperAdmin, distributionRates]);

   const distributionData = [{
      type: 'pie',
      labels: [t('execution_pool_label'), t('lead_management_label'), t('company'), t('admin_label')],
      values: [
         stats.totalRevenue * distributionRates.team * 0.8,
         stats.totalRevenue * distributionRates.team * 0.2,
         stats.totalRevenue * distributionRates.company,
         stats.totalRevenue * distributionRates.admin
      ],
      marker: {
         colors: ['#10B981', '#8B5CF6', '#3B82F6', '#FF0000']
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

      const list = payments?.data?.payments || (Array.isArray(payments) ? payments : []);
      list.forEach(p => {
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
   }, [payments, timePeriod]);

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
         toast.success(t('payment_confirmed_success'));
         fetchData();
      } catch (error) {
         console.error(error);
         toast.error(t('failed_confirm_payment'));
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleComplete = async (id) => {
      setIsSubmitting(true);
      try {
         await completePayment(id);
         toast.success(t('payment_marked_paid'));
         fetchData();
      } catch (error) {
         console.error(error);
         toast.error(t('failed_complete_payment'));
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleExport = async () => {
      try {
         await exportPaymentHistory();
         toast.success(t('export_started_success'));
      } catch (error) {
         // Error should be handled by store logic
      }
   }

   if (isLoading && paymentsList.length === 0) return <PageLoader />;

   return (
      <div className="p-8 space-y-8">
         <div id="payments-header-section">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{t('payment_management')}</h1>
                  <p className="text-gray-400">{t('payment_management_desc')}</p>
               </div>
               <div className="flex flex-wrap items-center gap-3">
                  {isSuperAdmin && (
                     <select
                        className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-dark-accent"
                        value={viewCompanyId}
                        onChange={(e) => setViewCompanyId(e.target.value)}
                     >
                        <option value="all">{t('all_companies')}</option>
                        {allCompanies.map(c => (
                           <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                     </select>
                  )}
                  <button
                     onClick={handleExport}
                     className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-download"></i>
                     <span>{t('export_report')}</span>
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
               <h3 className="text-gray-400 text-xs mb-1">{!isSuperAdmin ? t('my_total_earnings') : t('total_revenue')}</h3>
               <p className="text-2xl font-bold text-white">
                  ${(!isSuperAdmin ? (stats?.myTotalEarnings || 0) : (stats?.totalRevenue || 0)).toLocaleString()}
               </p>
               <p className="text-xs text-gray-500 mt-1">{!isSuperAdmin ? t('confirmed_payouts') : t('all_time_earnings')}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-yellow-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-clock text-yellow-500 text-xl"></i>
                  </div>
                  <span className="text-xs text-yellow-500 font-medium">{stats.pendingCount} {t('pending_count')}</span>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">{t('pending_payments')}</h3>
               <p className="text-2xl font-bold text-white">${stats?.pendingAmount?.toLocaleString()}</p>
               <p className="text-xs text-gray-500 mt-1">{t('awaiting_confirmation')}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-blue-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-calendar text-blue-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">{t('this_month')}</h3>
               <p className="text-2xl font-bold text-white">${stats?.thisMonthAmount?.toLocaleString()}</p>
               <p className="text-xs text-gray-500 mt-1">{t('current_month')}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-purple-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-users text-purple-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">{!isSuperAdmin ? t('my_estimated_share') : t('team_payouts')}</h3>
               <p className="text-2xl font-bold text-white">
                  ${(!isSuperAdmin ? (stats?.myEstimatedShare || 0) : (stats?.teamPayouts || 0)).toLocaleString()}
               </p>
               <p className="text-xs text-gray-500 mt-1">{!isSuperAdmin ? t('from_active_projects') : t('payouts_revenue_share')}</p>
            </div>
         </div>

         <div id="payment-distribution-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">{t('payment_distribution_calculator')}</h3>
                     <p className="text-sm text-gray-400">{t('automatic_salary_split_desc')}</p>
                  </div>
               </div>

               <div className="bg-dark-tertiary rounded-lg p-5 mb-6 border border-gray-700">
                  <label className="text-sm text-gray-400 mb-2 block">{t('calculator_amount_label')}</label>
                  <input type="number" value={projectAmount} onChange={(e) => setProjectAmount(Number(e.target.value))} className="w-full bg-dark-secondary border border-gray-700 rounded-lg px-4 py-3 text-white text-xl font-semibold focus:outline-none focus:border-dark-accent" id="project-amount" />
               </div>

               <div className="space-y-4">
                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-user-tie text-blue-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">{t('admin_generic')}</p>
                              <p className="text-xs text-gray-400">{t('ten_percent_of_total')}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * distributionRates.admin).toLocaleString()}</p>
                           <p className="text-xs text-blue-500">{Math.round(distributionRates.admin * 100)}%</p>
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
                              <p className="text-white font-medium">{t('company_generic')}</p>
                              <p className="text-xs text-gray-400">{t('twenty_percent_of_total')}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * distributionRates.company).toLocaleString()}</p>
                           <p className="text-xs text-yellow-500">{Math.round(distributionRates.company * 100)}%</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-green-500 transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-crown text-purple-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">{t('team_lead')}</p>
                              <p className="text-xs text-gray-400">{t('team_lead_share_desc')}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-white font-bold">${(projectAmount * distributionRates.team * 0.2).toLocaleString()}</p>
                           <p className="text-xs text-green-500">{Math.round(distributionRates.team * 0.2 * 100)}%</p>
                        </div>
                     </div>

                     <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-green-500 transition flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-microchip text-green-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">{t('execution_pool')}</p>
                              <p className="text-xs text-gray-400">{t('execution_pool_share_desc')}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-white font-bold">${(projectAmount * distributionRates.team * 0.8).toLocaleString()}</p>
                           <p className="text-xs text-green-500">{Math.round(distributionRates.team * 0.8 * 100)}%</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">{t('distribution_chart')}</h3>
                  <p className="text-sm text-gray-400">{t('visual_breakdown')}</p>
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
                  <h3 className="text-lg font-semibold text-white mb-1">{t('all_payments')}</h3>
                  <p className="text-sm text-gray-400">{t('manage_all_transactions')}</p>
               </div>
               <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                     <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                     <input
                        type="text"
                        placeholder={t('search_payments_placeholder')}
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
                     <option value="all">{t('all_statuses')}</option>
                     <option value="pending">{t('pending')}</option>
                     <option value="confirmed">{t('confirmed')}</option>
                     <option value="completed">{t('completed')}</option>
                  </select>
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full min-w-[800px]">
                  <thead>
                     <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{t('date_th')}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{t('description_th')}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{t('client_th')}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{t('amount_th')}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{t('my_salary_th')}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{t('method_th')}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{t('status_th')}</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">{t('action_th')}</th>
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
                                 <p className="text-sm text-white font-medium">{payment.description || t('no_description')}</p>
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
                                       const name = clientData?.name || (typeof payment.client === 'object' ? payment.client?.name : null) || (typeof payment.project?.createdBy === 'object' ? payment.project?.createdBy?.name : null) || t('unknown');

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
                                 {(() => {
                                    const share = calculateMyShare(payment);
                                    if (share > 0) {
                                       return (
                                          <div>
                                             <p className="text-sm text-green-400 font-bold">+${share.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                             <p className="text-[10px] text-gray-500">{t('from_tasks')}</p>
                                          </div>
                                       );
                                    }
                                    return <span className="text-xs text-gray-600">—</span>;
                                 })()}
                              </td>
                              <td className="py-4 px-4">
                                 <div className="flex items-center space-x-2">
                                    <select
                                       value={payment.paymentMethod || 'bank_transfer'}
                                       disabled={payment.status !== 'pending' || isSubmitting}
                                       onChange={async (e) => {
                                          const newVal = e.target.value;
                                          try {
                                             await updatePayment(payment._id, { paymentMethod: newVal });
                                             toast.success(`${t('method_updated_to')} ${t(newVal)}`, {
                                                position: 'top-right',
                                                autoClose: 5000,
                                                closeOnClick: false,
                                                draggable: false,
                                                theme: 'dark',
                                             });
                                          } catch (err) {
                                             toast.error(t('update_failed'), {
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
                                       <option value="bank_transfer">{t('bank_transfer')}</option>
                                       <option value="cash">{t('cash')}</option>
                                       <option value="card">{t('card')}</option>
                                       <option value="paypal">{t('paypal')}</option>
                                       <option value="crypto">{t('crypto')}</option>
                                       <option value="other">{t('other')}</option>
                                    </select>
                                 </div>
                              </td>
                              <td className="py-4 px-4">
                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit tracking-wider
                                         ${payment.status === 'pending' ? 'bg-yellow-500 bg-opacity-20 text-yellow-500' :
                                       payment.status === 'completed' ? 'bg-green-500 bg-opacity-20 text-green-500' :
                                          payment.status === 'confirmed' ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
                                             'bg-gray-500 bg-opacity-20 text-gray-500'}`}>
                                    {payment.status === 'pending' ? t('pending') :
                                       payment.status === 'confirmed' ? t('confirmed') : t('completed')}
                                 </span>
                              </td>
                              <td className="py-4 px-4">
                                 <div className="flex items-center gap-2">
                                    {(isSuperAdmin || userData?.role === 'company_admin') && payment.status === 'pending' ? (
                                       <button
                                          onClick={() => handleConfirm(payment._id)}
                                          disabled={isSubmitting}
                                          className="bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
                                          title={t('confirm_receipt')}
                                       >
                                          <i className="fa-solid fa-check"></i>
                                          {t('confirm')}
                                       </button>
                                    ) : (isSuperAdmin || userData?.role === 'company_admin') && payment.status === 'confirmed' ? (
                                       <button
                                          onClick={() => handleComplete(payment._id)}
                                          disabled={isSubmitting}
                                          className="bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50"
                                          title={t('mark_as_paid_to_team')}
                                       >
                                          <i className="fa-solid fa-flag-checkered"></i>
                                          {t('complete')}
                                       </button>
                                    ) : (
                                       <span className="text-xs text-gray-500 italic px-2">{t('no_actions')}</span>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="8" className="text-center py-8 text-gray-500">{t('no_payments_found')}</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         <div id="payment-history-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">{t('recent_completed')}</h3>
                  <p className="text-sm text-gray-400">{t('latest_finished_transactions')}</p>
               </div>
               <div className="space-y-3">
                  {paymentsList.filter(p => p.status === 'completed').slice(0, 5).map(payment => (
                     <div key={payment._id} className="flex items-center justify-between p-4 bg-dark-tertiary rounded-lg border border-gray-700 hover:border-green-500 transition">
                        <div className="flex items-center space-x-4">
                           <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-check text-green-500"></i>
                           </div>
                           <div>
                              <p className="text-sm text-white font-medium">{payment.description || t('payment_title')}</p>
                              <p className="text-xs text-gray-400">{t('confirmed_on')} {new Date(payment.updatedAt || payment.createdAt).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-sm text-white font-semibold">${(Number(payment.totalAmount) || Number(payment.amount) || 0).toLocaleString()}</p>
                           <p className="text-xs text-green-500">{t('distributed')}</p>
                        </div>
                     </div>
                  ))}
                  {paymentsList.filter(p => p.status === 'completed').length === 0 && (
                     <p className="text-gray-500 text-center py-4">{t('no_completed_payments_yet')}</p>
                  )}
               </div>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">{t('revenue_trends')}</h3>
                     <p className="text-sm text-gray-400">{t('past_performance')}</p>
                  </div>
                  <select
                     value={timePeriod}
                     onChange={(e) => setTimePeriod(e.target.value)}
                     className="bg-dark-tertiary border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-dark-accent"
                  >
                     <option value="6m">{t('last_6_months')}</option>
                     <option value="1y">{t('last_year')}</option>
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
