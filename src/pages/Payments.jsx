/* eslint-disable no-unused-vars */
/* eslint-disable no-unsafe-optional-chaining */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store/auth.store';
import { usePaymentStore } from '../store/payment.store';
import { useCompanyStore } from '../store/company.store';
import { useUserStore } from '../store/user.store';
import { useProjectStore } from '../store/project.store';
import { useTaskStore } from '../store/task.store';
import { paymentsApi } from '../api/payments.api';
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
   const [isInitialLoad, setIsInitialLoad] = useState(true);

   const { user } = useAuthStore();
   const { companies, selectedCompany, getCompanies, getCompanyById } = useCompanyStore();
   const { users, getAllUsers, getUsersByCompany } = useUserStore();
   const {
      payments,
      paymentHistory,
      getAllPayments,
      getPaymentsByCompany,
      getPaymentsByUser,
      getPaymentHistory,
      confirmPayment,
      completePayment,
      updatePayment,
      exportPaymentHistory,
      isLoading
   } = usePaymentStore();
   const { projects, getProjectsByCompany, getAllProjects } = useProjectStore();
   const { tasks, getTasksByProjects, getTasksByUser, getAllTasks } = useTaskStore();

   const userData = useMemo(() => user?.data?.user || user?.user || user, [user]);
   const isSuperAdmin = useMemo(() => userData?.role === 'super_admin', [userData]);
   const [activeTab, setActiveTab] = useState(userData?.role === 'employee' ? 'history' : 'invoices');

   const getCompanyRates = useMemo(() => (comp) => {
      const realComp = comp?.company || comp?.data?.company || comp || {};
      const rates = realComp.distributionRates || realComp.settings || realComp || {};
      const settings = realComp.settings || {};

      return {
         admin: Number(rates.customAdminRate || rates.adminRate || 10) / 100,
         team: Number(rates.customTeamRate || rates.teamRate || 70) / 100,
         company: Number(rates.customCommissionRate || rates.companyRate || 20) / 100,
         teamLead: Number(settings.teamLeadCommissionRate || rates.teamLeadCommissionRate || 10) / 100
      };
   }, []);

   const distributionRates = useMemo(() => getCompanyRates(selectedCompany), [selectedCompany, getCompanyRates]);

   const allCompanies = useMemo(() =>
      companies?.data?.companies || (Array.isArray(companies) ? companies : []),
      [companies]
   );

   const activeCompanyId = useMemo(() =>
      isSuperAdmin ? viewCompanyId : (userData?.company?._id || userData?.company || ''),
      [isSuperAdmin, viewCompanyId, userData]
   );

   // Load companies once on mount
   useEffect(() => {
      getCompanies();
   }, []);

   // Optimized data fetching with parallel requests
   const fetchData = useCallback(async () => {
      if (!userData) return;

      try {
         // Start all independent requests in parallel
         const requests = [];

         // Payment history (always fetch)
         requests.push(getPaymentHistory({}));

         if (isSuperAdmin && viewCompanyId === 'all') {
            if (allCompanies.length > 0) {
               const ids = allCompanies.map(c => c._id);
               requests.push(
                  getAllPayments(ids),
                  getAllUsers(ids),
                  getAllProjects(ids),
                  getAllTasks()
               );
            }
         } else if (activeCompanyId && activeCompanyId !== 'all') {
            // Fetch company-specific data in parallel
            requests.push(
               getPaymentsByCompany(activeCompanyId),
               getUsersByCompany(activeCompanyId),
               getProjectsByCompany(activeCompanyId)
            );
         } else if (userData?._id) {
            const companyId = userData.company?._id || userData.company || '';

            if (companyId) {
               requests.push(
                  getCompanyById(companyId),
                  getProjectsByCompany(companyId)
               );
            }

            if (userData.role === 'team_lead' || userData.role === 'company_admin') {
               if (companyId) {
                  requests.push(getPaymentsByCompany(companyId));
               }
            } else {
               requests.push(getPaymentsByUser(userData._id));
            }
         }

         // Execute all requests in parallel
         await Promise.all(requests);

         // Fetch tasks after projects are loaded (dependent request)
         // Use getState to avoid dependency on projects
         const currentProjects = useProjectStore.getState().projects;
         const projectList = currentProjects?.data?.projects || currentProjects?.projects || (Array.isArray(currentProjects) ? currentProjects : []);
         const projectIds = projectList.map(p => p._id || p.id).filter(Boolean);

         // Always fetch user tasks, and project tasks if we have projects
         const taskRequests = [];
         if (userData?._id) {
            taskRequests.push(getTasksByUser(userData._id));
         }
         if (projectIds.length > 0) {
            taskRequests.push(getTasksByProjects(projectIds));
         }

         if (taskRequests.length > 0) {
            await Promise.all(taskRequests);
         }
      } catch (error) {
         console.error('❌ Error fetching payments:', error);
         toast.error(t('failed_load_payments'));
      } finally {
         setIsInitialLoad(false);
      }
   }, [activeCompanyId, viewCompanyId, isSuperAdmin, userData, allCompanies.length]);

   // Trigger fetch when dependencies change
   useEffect(() => {
      if (allCompanies.length > 0 || !isSuperAdmin) {
         fetchData();
      }
   }, [fetchData]);

   const paymentsList = useMemo(() => {
      const list = payments?.data?.payments || payments?.payments || (Array.isArray(payments) ? payments : []);
      const currentUserId = String(userData?._id || userData?.id || '');

      if (isSuperAdmin) {
         if (viewCompanyId === 'all') return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
         return list.filter(p => {
            const pCompId = String(p.company?._id || p.company || '');
            return pCompId === viewCompanyId;
         }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      if (userData?.role === 'company_admin') {
         const userCompanyId = String(userData.company?._id || userData.company || '');
         return list.filter(p => {
            const pCompId = String(p.company?._id || p.company || '');
            return pCompId === userCompanyId;
         }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      const userCompanyId = String(userData?.company?._id || userData?.company || '');
      const filtered = list.filter(p => {
         const pCompId = String(p.company?._id || p.company || '');
         return pCompId === userCompanyId;
      });

      return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

   const calculateMyShare = useCallback((payment) => {
      if (!userData) return 0;

      const projectObj = payment.project || {};
      const projectId = String(projectObj._id || projectObj.id || projectObj || '');
      const currentUserId = String(userData._id || userData.id || '');

      const projectList = projects?.data?.projects || projects?.projects || (Array.isArray(projects) ? projects : []);
      const fullProject = projectList.find(p => String(p._id || p.id) === projectId) || projectObj;

      const allTasks = Array.isArray(tasks) ? tasks : (tasks?.data?.tasks || tasks?.tasks || []);
      const projectTasks = allTasks.filter(t => {
         const taskProjectId = String(t.project?._id || t.project?.id || t.project || '');
         return taskProjectId === projectId; // Include all tasks for estimate
      });

      let teamLeadId = '';
      teamLeadId = String(fullProject.teamLead?._id || fullProject.teamLead || '');

      if (!teamLeadId && fullProject.team) {
         const teamRef = fullProject.team;
         teamLeadId = String(teamRef.teamLead?._id || teamRef.teamLead || teamRef.teamLeadId || '');
      }

      if (!teamLeadId && fullProject.createdBy) {
         const createdById = String(fullProject.createdBy._id || fullProject.createdBy);
         const usersList = users?.data?.users || users?.users || (Array.isArray(users) ? users : []);
         const creator = usersList.find(u => String(u._id) === createdById);
         if (creator?.role === 'team_lead') {
            teamLeadId = createdById;
         }
      }

      const isLead = currentUserId === teamLeadId;

      const assignedMembers = fullProject.assignedMembers || fullProject.members || [];
      const isAssigned = assignedMembers.some(m => {
         const memberId = String(m.user?._id || m.user?.id || m.user || m._id || m.id || m || '');
         return memberId === currentUserId;
      });

      // Check if user has tasks
      const myTasks = projectTasks.filter(t => {
         const taskAssignedId = String(t.assignedTo?._id || t.assignedTo?.id || t.assignedTo || '');
         return taskAssignedId === currentUserId;
      });

      // If user is not involved in this project AT ALL, return 0
      if (!isLead && !isAssigned && myTasks.length === 0) {
         return 0;
      }

      const totalAmount = Number(payment.totalAmount) || Number(payment.amount) || 0;
      const pCompId = String(payment.company?._id || payment.company || fullProject.company?._id || fullProject.company || '');
      const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);
      // Prefer populated company from payment, then lookup, then fallback
      const pSettings = (payment.company && payment.company.settings) ? payment.company : null;
      const foundComp = companyList.find(c => String(c._id) === pCompId);
      const pComp = pSettings || foundComp || selectedCompany;
      const rates = getCompanyRates(pComp);

      let share = 0;

      // Team Lead Commission
      if (isLead) {
         const settings = pComp?.settings || pComp?.data?.company?.settings || {};
         const teamLeadCommissionRate = settings.teamLeadCommissionRate || 10;
         const commission = (totalAmount * teamLeadCommissionRate) / 100;
         share += commission;
      }

      // Employee task-based salary
      // Calculate execution budget (Team Share - Lead Commission)
      // Note: Lead Commission is dynamic from settings
      const settings = pComp?.settings || pComp?.data?.company?.settings || {};
      const teamLeadRateVal = Number(settings.teamLeadCommissionRate || 10) / 100;
      const leadCommissionAmount = totalAmount * teamLeadRateVal;

      const teamBudgetTotal = totalAmount * rates.team;
      const executionBudget = Math.max(0, teamBudgetTotal - leadCommissionAmount);

      // Employee task-based salary
      const totalWeight = projectTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);

      if (totalWeight > 0 && myTasks.length > 0) {
         const myWeight = myTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);
         const myShare = (myWeight / totalWeight) * executionBudget;
         share += myShare;
      }

      // Fallback: If user is assigned but has no tasks yet, estimate equal distribution
      if (isAssigned && myTasks.length === 0 && totalWeight === 0 && fullProject.status !== 'completed') {
         const memberCount = assignedMembers.length || 1;
         const estimatedShare = executionBudget / memberCount;
         share += estimatedShare;
      }

      // Company Admin commission
      if (userData.role === 'company_admin') {
         const adminShare = totalAmount * rates.admin;
         share += adminShare;
      }

      return share;
   }, [userData, tasks, projects, companies, selectedCompany, getCompanyRates, users]);

   // Fetch salaries from backend for all completed payments
   const [paymentSalaries, setPaymentSalaries] = useState({});
   const [salariesLoading, setSalariesLoading] = useState(false);

   useEffect(() => {
      const fetchSalaries = async () => {
         const paymentsList = payments?.data?.payments || (Array.isArray(payments) ? payments : []);
         if (!userData || paymentsList.length === 0) return;

         setSalariesLoading(true);
         const salariesMap = {};

         try {
            // Fetch salaries for all completed payments
            const completedPayments = paymentsList.filter(p => p.status === 'completed');

            for (const payment of completedPayments) {
               try {
                  const res = await paymentsApi.getSalaries(payment._id);
                  const salaries = res.data?.data?.salaries || [];

                  // Find current user's salary
                  const mySalary = salaries.find(s =>
                     String(s.employeeId) === String(userData._id)
                  );

                  salariesMap[payment._id] = mySalary?.amount || 0;
               } catch (err) {
                  // If error, set to 0
                  salariesMap[payment._id] = 0;
               }
            }

            setPaymentSalaries(salariesMap);
         } catch (error) {
            console.error('Error fetching salaries:', error);
         } finally {
            setSalariesLoading(false);
         }
      };

      fetchSalaries();
   }, [payments, userData]); // Use payments, not filteredPayments

   const stats = useMemo(() => {
      const activeList = filteredPayments;

      const totalRevenue = activeList.reduce((sum, p) =>
         sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0
      );

      const pendingPayments = activeList.filter(p => p.status === 'pending');
      const pendingAmount = pendingPayments.reduce((sum, p) =>
         sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0
      );
      const pendingCount = pendingPayments.length;

      const now = new Date();
      const thisMonthPayments = activeList.filter(p => {
         const d = new Date(p.createdAt);
         return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const thisMonthAmount = thisMonthPayments.reduce((sum, p) =>
         sum + (Number(p.totalAmount) || Number(p.amount) || 0), 0
      );

      const myTotalEarnings = userData?.totalEarned || 0;

      const projectList = projects?.data?.projects || projects?.projects || (Array.isArray(projects) ? projects : []);
      const myEstimatedShare = !isSuperAdmin ? projectList.reduce((sum, proj) =>
         proj.status === 'completed' ? sum : sum + calculateMyShare({
            project: proj,
            totalAmount: proj.budget || 0,
            status: 'pending'
         }), 0
      ) : 0;

      let teamPayouts = 0, leadManagementPool = 0, executionPool = 0, adminPool = 0, companyPool = 0;
      const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);

      activeList.forEach(p => {
         const amount = Number(p.totalAmount) || Number(p.amount) || 0;
         const pCompId = String(p.company?._id || p.company || p.project?.company?._id || p.project?.company || '');
         // Prefer populated company from payment, then lookup, then fallback
         const pSettings = (p.company && p.company.settings) ? p.company : null;
         const foundComp = companyList.find(c => String(c._id) === pCompId);
         const pComp = pSettings || foundComp || selectedCompany;
         const rates = getCompanyRates(pComp);

         const settings = pComp?.settings || pComp?.data?.company?.settings || {};
         const teamLeadRateVal = Number(settings.teamLeadCommissionRate || 10) / 100;

         const leadShare = amount * teamLeadRateVal;
         const teamShareTotal = amount * rates.team;

         // Execution pool is the remaining team share after deducting lead commission
         const executionShare = teamShareTotal - leadShare;

         teamPayouts += teamShareTotal;
         leadManagementPool += leadShare;
         executionPool += Math.max(0, executionShare);
         adminPool += amount * rates.admin;
         companyPool += amount * rates.company;
      });

      return {
         totalRevenue,
         pendingAmount,
         pendingCount,
         thisMonthAmount,
         teamPayouts,
         myTotalEarnings,
         myEstimatedShare,
         leadManagementPool,
         executionPool,
         adminPool,
         companyPool
      };
   }, [filteredPayments, calculateMyShare, userData, projects, isSuperAdmin, getCompanyRates, companies, selectedCompany]);

   const distributionData = [{
      type: 'pie',
      labels: [t('execution_pool_label'), t('lead_management_label'), t('company'), t('admin_label')],
      values: [stats.executionPool, stats.leadManagementPool, stats.companyPool, stats.adminPool],
      marker: {
         colors: ['#10B981', '#8B5CF6', '#3B82F6', '#EF4444']
      },
      textinfo: 'label+value',
      textfont: {
         color: '#FFFFFF',
         size: 10
      },
      hovertemplate: '%{label}: $%{value}<extra></extra>'
   }];

   const distributionLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      showlegend: false
   };

   const handleConfirm = async (id) => {
      setIsSubmitting(true);
      try {
         await confirmPayment(id);
         toast.success(t('payment_confirmed_success'));
         // Don't call fetchData - store already updated the payment
      } catch (e) {
         console.error(e);
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
         // Don't call fetchData - store already updated the payment
      } catch (e) {
         console.error(e);
         toast.error(t('failed_complete_payment'));
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleExport = async () => {
      try {
         await exportPaymentHistory();
         toast.success(t('export_started_success'));
      } catch (e) { /* empty */ }
   };

   // Show loader only on initial load
   if (isInitialLoad && isLoading) {
      return <PageLoader />;
   }

   return (
      <div className="min-h-screen p-6 lg:p-10 bg-gray-50/50 dark:bg-black text-gray-900 dark:text-white font-sans">
         <div className="max-w-[1600px] mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t('payment_management')}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('payment_management_desc')}</p>
               </div>
               <div className="flex flex-wrap items-center gap-3">
                  {isSuperAdmin && (
                     <select
                        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm"
                        value={viewCompanyId}
                        onChange={(e) => setViewCompanyId(e.target.value)}
                     >
                        <option value="all">{t('all_companies')}</option>
                        {allCompanies.map(c => (<option key={c._id} value={c._id}>{c.name}</option>))}
                     </select>
                  )}
                  <button onClick={handleExport} className="bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-sm border border-gray-200 dark:border-zinc-800 flex items-center gap-2">
                     <i className="fa-solid fa-download"></i>
                     <span>{t('export_report')}</span>
                  </button>
               </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{!isSuperAdmin ? t('my_total_earnings') : t('total_revenue')}</p>
                     <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">${(!isSuperAdmin ? (stats?.myTotalEarnings || 0) : (stats?.totalRevenue || 0)).toLocaleString()}</p>
                     <div className="h-1 w-12 bg-green-500 rounded-full"></div>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-yellow-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('pending_payments')}</p>
                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.pendingCount} pending</span>
                     </div>
                     <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">${stats?.pendingAmount?.toLocaleString()}</p>
                     <div className="h-1 w-12 bg-yellow-500 rounded-full"></div>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('this_month')}</p>
                     <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">${stats?.thisMonthAmount?.toLocaleString()}</p>
                     <div className="h-1 w-12 bg-blue-500 rounded-full"></div>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                     {(() => {
                        const showTeamPayouts = isSuperAdmin || userData?.role === 'company_admin' || userData?.role === 'team_lead';

                        let amount = 0;
                        if (isSuperAdmin || userData?.role === 'company_admin') {
                           amount = stats?.teamPayouts || 0;
                        } else if (userData?.role === 'team_lead') {
                           // For Team Lead, show only the execution pool (team payouts WITHOUT team lead share)
                           amount = stats?.executionPool || 0;
                        } else {
                           amount = stats?.myEstimatedShare || 0;
                        }

                        return (
                           <>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{showTeamPayouts ? t('team_payouts') : t('my_estimated_share')}</p>
                              <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">${amount.toLocaleString()}</p>
                           </>
                        );
                     })()}
                     <div className="h-1 w-12 bg-purple-500 rounded-full"></div>
                  </div>
               </div>
            </div>

            {/* Distribution Calculator & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                  <div className="mb-6">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                        <i className="fa-solid fa-calculator text-gray-400"></i>
                        {t('payment_distribution_calculator')}
                     </h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('automatic_salary_split_desc')}</p>
                  </div>

                  <div className="bg-gray-50/50 dark:bg-black/40 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-zinc-800">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">{t('calculator_amount_label')}</label>
                     <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">$</span>
                        <input
                           type="number"
                           value={projectAmount}
                           onChange={(e) => setProjectAmount(e.target.value === '' ? '' : Number(e.target.value))}
                           className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-10 py-3 text-gray-900 dark:text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {[{
                        label: t('admin_generic'), val: rates => rates.admin, color: 'blue', icon: 'fa-user-tie'
                     }, {
                        label: t('company_generic'), val: rates => rates.company, color: 'yellow', icon: 'fa-building'
                     }, {
                        label: t('team_lead'), val: rates => rates.teamLead, color: 'purple', icon: 'fa-crown'
                     }, {
                        label: t('execution_pool'), val: rates => Math.max(0, rates.team - rates.teamLead), color: 'green', icon: 'fa-microchip'
                     }].map((row, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors">
                           <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 bg-${row.color}-50 dark:bg-${row.color}-900/20 rounded-xl flex items-center justify-center`}>
                                 <i className={`fa-solid ${row.icon} text-${row.color}-500`}></i>
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-gray-900 dark:text-white">{row.label}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-lg font-black text-gray-900 dark:text-white">${(projectAmount * row.val(distributionRates)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm flex flex-col justify-center items-center">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 w-full text-left flex items-center gap-2">
                     <i className="fa-solid fa-chart-pie text-gray-400"></i>
                     {t('distribution_chart')}
                  </h3>
                  <div className="w-full h-[300px]">
                     <Plot data={distributionData} layout={distributionLayout} useResizeHandler={true} style={{ width: "100%", height: "100%" }} config={{ displayModeBar: false }} />
                  </div>
               </div>
            </div>

            {/* Payments/History Tabs & Table */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
               <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-6">
                     <div className="flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
                        <button
                           onClick={() => setActiveTab('invoices')}
                           className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                           {t('invoices', 'Project Invoices')}
                        </button>
                        <button
                           onClick={() => setActiveTab('history')}
                           className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-black text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                           {t('earnings_history', 'Earnings History')}
                        </button>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                     <div className="relative">
                        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                           type="text"
                           placeholder={t('search_payments_placeholder')}
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                     </div>
                     <select className="px-4 py-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">{t('all_statuses')}</option>
                        <option value="pending">{t('pending')}</option>
                        <option value="confirmed">{t('confirmed')}</option>
                        <option value="completed">{t('completed')}</option>
                     </select>
                  </div>
               </div>

               {/* Show mini loader during background updates */}
               {isLoading && !isInitialLoad && (
                  <div className="absolute top-20 right-6 z-50">
                     <div className="bg-white dark:bg-zinc-800 rounded-full px-4 py-2 shadow-lg border border-gray-200 dark:border-zinc-700 flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Updating...</span>
                     </div>
                  </div>
               )}

               <div className="overflow-x-auto">
                  {activeTab === 'invoices' ? (
                     <table className="w-full whitespace-nowrap">
                        <thead>
                           <tr className="bg-gray-50/50 dark:bg-zinc-800/50 text-left">
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('date_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('description_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('client_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('amount_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('my_salary_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('method_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('status_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider text-right">{t('action_th')}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                           {filteredPayments.length > 0 ? filteredPayments.map(payment => (
                              <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                 <td className="px-6 py-4 text-sm font-medium text-gray-500">
                                    {new Date(payment.createdAt).toLocaleDateString()}
                                 </td>
                                 <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{payment.description || t('no_description')}</p>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">#{payment._id.slice(-6)}</p>
                                 </td>
                                 <td className="px-6 py-4">
                                    {(() => {
                                       const name = payment.client?.name || payment.project?.createdBy?.name || t('unknown');
                                       return (
                                          <div className="flex items-center gap-2">
                                             <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                                {name.charAt(0).toUpperCase()}
                                             </div>
                                             <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
                                          </div>
                                       );
                                    })()}
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className="text-sm font-black text-gray-900 dark:text-white">
                                       ${(Number(payment.totalAmount) || Number(payment.amount) || 0).toLocaleString()}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    {(() => {
                                       const share = paymentSalaries[payment._id];
                                       if (share === undefined) {
                                          // Still loading or not completed
                                          return <span className="text-gray-400 text-lg leading-none">&mdash;</span>;
                                       }
                                       return share > 0 ? (
                                          <span className="inline-flex items-center gap-1 text-sm font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                             +${share.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                       ) : <span className="text-gray-400 text-lg leading-none">&mdash;</span>;
                                    })()}
                                 </td>
                                 <td className="px-6 py-4">
                                    <select
                                       value={payment.paymentMethod || 'bank_transfer'}
                                       disabled={payment.status !== 'pending' || isSubmitting}
                                       onChange={async e => { try { await updatePayment(payment._id, { paymentMethod: e.target.value }); toast.success(t('update_success')); } catch (e) { toast.error(t('update_failed')); } }}
                                       className="bg-gray-50 dark:bg-black/40 text-xs font-bold text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 focus:outline-none focus:border-blue-500 disabled:opacity-50 appearance-none cursor-pointer"
                                    >
                                       <option value="bank_transfer">{t('bank_transfer')}</option>
                                       <option value="cash">{t('cash')}</option>
                                       <option value="card">{t('card')}</option>
                                       <option value="paypal">{t('paypal')}</option>
                                       <option value="crypto">{t('crypto')}</option>
                                       <option value="other">{t('other')}</option>
                                    </select>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${payment.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30' :
                                       payment.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' :
                                          'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30'
                                       }`}>
                                       {t(payment.status)}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                       {(isSuperAdmin || userData?.role === 'company_admin') && payment.status === 'pending' ? (
                                          <button onClick={() => handleConfirm(payment._id)} disabled={isSubmitting} className="bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                             {t('confirm')}
                                          </button>
                                       ) : (isSuperAdmin || userData?.role === 'company_admin') && payment.status === 'confirmed' ? (
                                          <button onClick={() => handleComplete(payment._id)} disabled={isSubmitting} className="bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                             {t('complete')}
                                          </button>
                                       ) : (
                                          <span className="text-xs font-medium text-gray-400 italic block py-1.5">{t('no_actions')}</span>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                           )) : (
                              <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500 font-medium">{t('no_payments_found')}</td></tr>
                           )}
                        </tbody>
                     </table>
                  ) : (
                     <div className="p-6">
                        <p className="text-center text-gray-500">Payment History Table (implement similar to invoices)</p>
                     </div>
                  )}
               </div>
            </div>

         </div>
      </div>
   );
};

export default Payments;
