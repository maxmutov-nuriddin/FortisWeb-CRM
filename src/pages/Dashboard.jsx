/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { useProjectStore } from '../store/project.store';
import { useAuthStore } from '../store/auth.store';
import PageLoader from '../components/loader/PageLoader';
import { usePaymentStore } from '../store/payment.store';
import { isOnline, isToday, isYesterday } from '../utils/date';
import { useUserStore } from '../store/user.store';
import { useCompanyStore } from '../store/company.store';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../store/task.store';
import { useSettingsStore } from '../store/settings.store';

const Dashboard = () => {
   const { t, i18n } = useTranslation();
   const { theme } = useSettingsStore();

   const { user, isLoading: authLoading, error: authError } = useAuthStore();
   const { users, getUsersByCompany, getAllUsers, isLoading: usersLoading } = useUserStore();
   const { projects, getProjectsByCompany, getAllProjects, isLoading: projectsLoading, error: projectsError } = useProjectStore();
   const { payments, getPaymentsByCompany, getAllPayments, isLoading: paymentsLoading, error: paymentsError } = usePaymentStore();
   const { companies, selectedCompany, getCompanies, getCompanyById, isLoading: companiesLoading } = useCompanyStore();
   const { tasks, getTasksByUser, getTasksByProjects } = useTaskStore();

   const [newOrder, setNewOrder] = useState(0);
   const [activeProjects, setActiveProjects] = useState(0);
   const [inProgress, setInProgress] = useState(0);
   const [totalProjects, setTotalProjects] = useState(0);
   const [todayRevenue, setTodayRevenue] = useState(0);
   const [revenuePercent, setRevenuePercent] = useState(0);
   const [todayProjectsCount, setTodayProjectsCount] = useState(0);
   const [todayProjects, setTodayProjects] = useState([]);
   const [totalMembers, setTotalMembers] = useState(0);
   const [onlineMembers, setOnlineMembers] = useState(0);
   const [activeRoles, setActiveRoles] = useState(0);
   const [period, setPeriod] = useState('6m');
   const [selectedProject, setSelectedProject] = useState(null);
   const [salaryTotals, setSalaryTotals] = useState({
      execution: 0,
      leadManagement: 0,
      admin: 0,
      company: 0
   });
   const [personalStats, setPersonalStats] = useState({
      totalWeight: 0,
      completedWeight: 0,
      earnings: {
         completed: 0,
         in_progress: 0,
         review: 0,
         revision: 0,
         todo: 0
      }
   });

   const userData = useMemo(() => user?.data?.user || user?.user || user, [user]);
   const isSuperAdmin = useMemo(() => userData?.role === 'super_admin', [userData]);
   const isAdmin = useMemo(() => isSuperAdmin || userData?.role === 'company_admin' || userData?.role === 'team_lead', [userData, isSuperAdmin]);

   const getCompanyRates = useMemo(() => (comp) => {
      const realComp = comp?.company || comp?.data?.company || comp || {};
      const rates = realComp.distributionRates || realComp.settings || realComp || {};
      return {
         admin: Number(rates.customAdminRate || rates.adminRate || 10) / 100,
         team: Number(rates.customTeamRate || rates.teamRate || 70) / 100,
         company: Number(rates.customCommissionRate || rates.companyRate || 20) / 100
      };
   }, []);

   const calculateShare = React.useCallback((payment) => {
      if (!userData) return 0;
      const amount = Number(payment.totalAmount) || Number(payment.amount) || 0;
      if (isSuperAdmin || userData.role === 'company_admin') return amount;

      const pCompId = String(payment.company?._id || payment.company || '');
      const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);
      // Prefer populated company from payment, then lookup, then fallback
      const pSettings = (payment.company && payment.company.settings) ? payment.company : null;
      const foundComp = companyList.find(c => String(c._id) === pCompId);
      const pComp = pSettings || foundComp || selectedCompany;
      const rates = getCompanyRates(pComp);

      if (userData.role === 'team_lead') {
         return amount * rates.team;
      }

      const projectId = String(payment.project?._id || payment.project || '');
      const allTasks = Array.isArray(tasks) ? tasks : (tasks?.data?.tasks || tasks?.tasks || []);
      const projectTasks = allTasks.filter(t => String(t.project?._id || t.project || '') === projectId && t.status === 'completed');

      const totalWeight = projectTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);

      // Dynamic Execution Pool
      const settings = pComp?.settings || pComp?.data?.company?.settings || {};
      const teamLeadRateVal = Number(settings.teamLeadCommissionRate || 10) / 100;
      const leadCommissionAmount = amount * teamLeadRateVal;
      const teamBudgetTotal = amount * rates.team;
      const executionPool = Math.max(0, teamBudgetTotal - leadCommissionAmount);

      if (totalWeight > 0) {
         const myTasks = projectTasks.filter(t => String(t.assignedTo?._id || t.assignedTo || '') === String(userData._id));
         const myWeight = myTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);
         return (myWeight / totalWeight) * executionPool;
      }

      return 0;
   }, [userData, isSuperAdmin, companies, selectedCompany, getCompanyRates, tasks]);

   const distributionRates = useMemo(() => getCompanyRates(selectedCompany), [selectedCompany, getCompanyRates]);

   // ... (allTeams logic - unchanged) ...
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

         const currentUserId = String(userData?._id || '');
         return companyTeams.filter(t =>
            String(t.teamLead?._id || t.teamLead || '') === currentUserId ||
            t.members?.some(m => String(m?._id || m.user?._id || m.user || m) === currentUserId)
         );
      }
   }, [companies, selectedCompany, userData, isSuperAdmin, getCompanyRates]);

   const filteredProjects = useMemo(() => {
      const all = projects?.data?.projects || (Array.isArray(projects) ? projects : []);
      if (isSuperAdmin || userData?.role === 'company_admin') return all;

      const currentUserId = String(userData?._id || '');
      const myTeamIds = new Set(allTeams.map(t => String(t._id)));

      return all.filter(p => {
         const isAssigned = p.assignedMembers?.some(m => String(m.user?._id || m.user || m) === currentUserId);
         if (isAssigned) return true;

         const projectTeamId = String(p.team?._id || p.team || '');
         if (myTeamIds.has(projectTeamId)) return true;

         return false;
      });
   }, [projects, isSuperAdmin, userData, allTeams]);

   const filteredPayments = useMemo(() => {
      const all = payments?.data?.payments || (Array.isArray(payments) ? payments : []);
      if (isSuperAdmin || userData?.role === 'company_admin') return all;

      const visibleProjectIds = new Set(filteredProjects.map(p => String(p._id)));
      return all.filter(p => {
         const pId = String(p.project?._id || p.project || '');
         return visibleProjectIds.has(pId);
      });
   }, [payments, isSuperAdmin, userData, filteredProjects]);

   const filteredUsers = useMemo(() => {
      const all = users?.data?.users || (Array.isArray(users) ? users : []);
      if (isSuperAdmin || userData?.role === 'company_admin') return all;

      const memberIds = new Set();
      allTeams.forEach(t => {
         if (t.members) t.members.forEach(m => memberIds.add(String(m?._id || m.user?._id || m.user || m)));
         memberIds.add(String(t.teamLead?._id || t.teamLead || ''));
      });
      memberIds.add(String(userData?._id));

      return all.filter(u => memberIds.has(String(u._id)));
   }, [users, isSuperAdmin, userData, allTeams]);

   // FIX: Update Salary Totals Calculation with Dynamic Rates
   useEffect(() => {
      if (!filteredPayments) return;

      let execution = 0;
      let leadManagement = 0;
      let admin = 0;
      let company = 0;

      const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);

      filteredPayments.forEach(p => {
         // FIX: Ignore pending or canceled payments for stats
         if (p.status === 'pending' || p.status === 'canceled' || p.status === 'failed') return;

         const amount = Number(p.totalAmount) || Number(p.amount) || 0;
         const pCompId = String(p.company?._id || p.company || '');

         // Use populated settings
         const pSettings = (p.company && p.company.settings) ? p.company : null;
         const foundComp = companyList.find(c => String(c._id) === pCompId);
         const pComp = pSettings || foundComp || selectedCompany;
         const rates = getCompanyRates(pComp);

         const settings = pComp?.settings || pComp?.data?.company?.settings || {};
         const teamLeadRateVal = Number(settings.teamLeadCommissionRate || 10) / 100;

         const leadShare = amount * teamLeadRateVal;
         const teamShareTotal = amount * rates.team;
         const executionShare = Math.max(0, teamShareTotal - leadShare);

         execution += executionShare;
         leadManagement += leadShare;
         admin += amount * rates.admin;
         company += amount * rates.company;
      });

      setSalaryTotals({ execution, leadManagement, admin, company });
   }, [filteredPayments, distributionRates, companies, selectedCompany, getCompanyRates]);


   // FIX: Update Personal Stats Logic for Admins/Team Leads
   useEffect(() => {
      if (isAdmin || !tasks || !filteredProjects) return;

      const allTasks = Array.isArray(tasks) ? tasks : (tasks.data?.tasks || []);
      let tWeight = 0;
      let cWeight = 0;
      const earn = { completed: 0, in_progress: 0, review: 0, revision: 0, todo: 0 };
      const projectTotalWeights = {};

      allTasks.forEach(t => {
         const pId = String(t.project?._id || t.project || '');
         if (pId) {
            projectTotalWeights[pId] = (projectTotalWeights[pId] || 0) + (Number(t.weight) || 0);
         }
      });

      const currentUserId = String(userData?._id || '');
      const myTasks = allTasks.filter(t => String(t.assignedTo?._id || t.assignedTo || '') === currentUserId);

      myTasks.forEach(task => {
         const weight = Number(task.weight) || 0;
         tWeight += weight;
         if (task.status === 'completed') cWeight += weight;

         const project = filteredProjects.find(p => String(p._id) === String(task.project?._id || task.project));
         if (project) {
            const projectPayment = (payments?.data?.payments || []).find(pay => String(pay._id) === String(project.payment));
            if (projectPayment && (projectPayment.status === 'confirmed' || projectPayment.status === 'completed')) {
               const amount = Number(projectPayment.totalAmount) || Number(projectPayment.amount) || 0;
               const pCompId = String(projectPayment.company?._id || projectPayment.company || project.company?._id || project.company || '');

               const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);
               const pSettings = (projectPayment.company && projectPayment.company.settings) ? projectPayment.company : null;
               const foundComp = companyList.find(c => String(c._id) === pCompId);
               const pComp = pSettings || foundComp || selectedCompany;
               const rates = getCompanyRates(pComp);

               const settings = pComp?.settings || pComp?.data?.company?.settings || {};
               const teamLeadRateVal = Number(settings.teamLeadCommissionRate || 10) / 100;

               const leadShare = amount * teamLeadRateVal;
               const teamShareTotal = amount * rates.team;
               const executionPool = Math.max(0, teamShareTotal - leadShare);

               const pId = String(project._id);
               const totalPWeight = projectTotalWeights[pId] || 100;

               const share = (weight / totalPWeight) * executionPool;
               if (earn[task.status] !== undefined) {
                  earn[task.status] += share;
               }
            }
         }
      });

      setPersonalStats({
         totalWeight: tWeight,
         completedWeight: cWeight,
         earnings: earn
      });
   }, [tasks, filteredProjects, payments, isAdmin, userData, distributionRates]);

   // CHART DATA CONFIGURATION
   const isTeamLead = userData?.role === 'team_lead';
   // If Team Lead, show Eexecution + Lead Management. If Admin/SuperAdmin, show All.
   const chartLabels = isTeamLead
      ? [t('execution_pool_label'), t('lead_management_label')]
      : isAdmin
         ? [t('execution_pool_label'), t('lead_management_label'), t('admin_label'), t('company')]
         : [t('completed'), t('pending')];

   const chartValues = isTeamLead
      ? [salaryTotals.execution, salaryTotals.leadManagement]
      : isAdmin
         ? [salaryTotals.execution, salaryTotals.leadManagement, salaryTotals.admin, salaryTotals.company]
         : [personalStats.completedWeight, personalStats.totalWeight - personalStats.completedWeight];

   const chartColors = isTeamLead
      ? ['#10B981', '#8B5CF6']
      : isAdmin
         ? ['#10B981', '#8B5CF6', '#EF4444', '#3B82F6']
         : ['#10B981', '#F59E0B'];

   const salaryData = [{
      type: 'pie',
      labels: chartLabels,
      values: chartValues,
      marker: {
         colors: chartColors
      },
      textinfo: 'label+percent',
      textfont: { color: '#FFFFFF', size: 12 },
      hoverinfo: 'label+value',
      showlegend: false
   }];

   const salaryLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      height: 250,
      showlegend: false
   };

   const filterPaymentsByPeriod = (payments, period) => {
      const now = new Date();
      return payments.filter(p => {
         const date = new Date(p.createdAt);
         if (period === '6m') {
            const d = new Date();
            d.setMonth(now.getMonth() - 6);
            return date >= d;
         }
         if (period === '1y') {
            const d = new Date();
            d.setFullYear(now.getFullYear() - 1);
            return date >= d;
         }
         return true;
      });
   };

   const getMonthlyRevenue = (payments) => {
      const map = {};
      payments.forEach(p => {
         const d = new Date(p.createdAt);
         const key = `${d.getFullYear()}-${d.getMonth()}`;
         map[key] = (map[key] || 0) + Number(p.totalAmount);
      });
      const keys = Object.keys(map).sort((a, b) => new Date(a) - new Date(b));
      return {
         labels: keys.map(k => {
            const [y, m] = k.split('-');
            return new Date(y, m).toLocaleString(i18n.language || 'en', { month: 'short' });
         }),
         values: keys.map(k => map[k])
      };
   };

   const revenueChart = useMemo(() => {
      if (!filteredPayments) return { labels: [], values: [] };
      const filtered = filterPaymentsByPeriod(filteredPayments, period);
      return getMonthlyRevenue(filtered);
   }, [filteredPayments, period]);

   const revenueData = [{
      type: 'scatter',
      mode: 'lines',
      x: revenueChart.labels,
      y: revenueChart.values,
      line: { color: '#DC2626', width: 4, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(220, 38, 38, 0.1)'
   }];

   const revenueLayout = {
      autosize: true,
      margin: { t: 20, r: 20, b: 40, l: 40 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      xaxis: { color: theme === 'dark' ? '#9CA3AF' : '#6B7280', showgrid: false },
      yaxis: { color: theme === 'dark' ? '#9CA3AF' : '#6B7280', gridcolor: theme === 'dark' ? '#374151' : '#E5E7EB' },
      font: { family: 'Inter, sans-serif' },
      showlegend: false
   };

   useEffect(() => {
      let usersList = filteredUsers;
      if (!usersList || usersList.length === 0) {
         setActiveRoles(0);
         setTotalMembers(0);
         setOnlineMembers(0);
         return;
      }
      setActiveRoles(new Set(usersList.filter(u => u.isActive).map(u => u.role)).size);
      setTotalMembers(usersList.length);
      setOnlineMembers(usersList.filter(u => isOnline(u.lastLogin)).length);
   }, [filteredUsers]);

   useEffect(() => {
      const paymentsList = filteredPayments;
      if (!paymentsList || paymentsList.length === 0) {
         setTodayRevenue(0);
         setRevenuePercent(0);
         setTodayProjectsCount(0);
         return;
      }
      const todayPayments = paymentsList.filter(p => isToday(p.createdAt) && p.status !== 'pending' && p.status !== 'canceled');
      const todaySum = todayPayments.reduce((sum, p) => sum + calculateShare(p), 0);
      const yesterdaySum = paymentsList.filter(p => isYesterday(p.createdAt) && p.status !== 'pending' && p.status !== 'canceled').reduce((sum, p) => sum + calculateShare(p), 0);
      const percent = yesterdaySum ? Math.round(((todaySum - yesterdaySum) / yesterdaySum) * 100) : 100;
      setTodayRevenue(Math.round(todaySum));
      setRevenuePercent(percent);
      setTodayProjectsCount(new Set(todayPayments.map(p => p.project?._id)).size);
   }, [filteredPayments, calculateShare]);

   useEffect(() => {
      const initDashboard = async () => {
         if (!userData) return;
         const companyId = userData.company?._id || userData.company;
         const role = userData.role;

         if (role === 'super_admin') {
            const res = await getCompanies();
            const companiesList = res?.data?.companies || res?.companies || (Array.isArray(res) ? res : []);
            const finalCompanies = companiesList.length > 0 ? companiesList : (companies?.data?.companies || []);
            const companyIds = finalCompanies.map(c => c._id).filter(Boolean);
            if (companyIds.length > 0) {
               getAllProjects(companyIds);
               getAllPayments(companyIds);
               getAllUsers(companyIds);
            }
         } else if (companyId) {
            getCompanyById(companyId);
            getProjectsByCompany(companyId);
            getPaymentsByCompany(companyId);
            getUsersByCompany(companyId);
            if (role !== 'company_admin' && role !== 'team_lead') {
               const myProjects = filteredProjects.map(p => p._id);
               if (myProjects.length > 0) {
                  getTasksByProjects(myProjects);
               } else {
                  getTasksByUser(userData._id || userData.id);
               }
            }
         }
      };
      initDashboard();
   }, [userData]);

   useEffect(() => {
      const projectsData = filteredProjects;
      if (!Array.isArray(projectsData) || projectsData.length === 0) {
         setTodayProjects([]);
         setNewOrder(0);
         setActiveProjects(0);
         setInProgress(0);
         setTotalProjects(0);
         return;
      }
      setTodayProjects(projectsData.filter(p => isToday(p.createdAt)));
      setNewOrder(projectsData.filter(p => p.status === 'pending').length);
      setActiveProjects(projectsData.filter(p => ['in_progress', 'review', 'revision'].includes(p.status)).length);
      setInProgress(projectsData.filter(p => p.status === 'in_progress').length);
      setTotalProjects(projectsData.length);
   }, [filteredProjects]);

   const recentOrders = useMemo(() => {
      if (!filteredProjects || filteredProjects.length === 0) return [];
      return [...filteredProjects]
         .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
         .slice(0, 5);
   }, [filteredProjects]);

   const getAmountByProject = (project) => {
      if (!project.payment || !filteredPayments) return '—';
      const payment = filteredPayments.find(p => p._id === project.payment);
      return payment ? `$${payment.totalAmount}` : '—';
   };

   const statusBadge = (status) => {
      switch (status) {
         case 'pending': return 'bg-yellow-50 text-yellow-600 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30';
         case 'in_progress': return 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
         case 'completed': return 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30';
         default: return 'bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      }
   };

   const projectPayments = (payments?.data?.payments || (Array.isArray(payments) ? payments : [])).filter(
      p => String(p.project?._id || p.project || '') === String(selectedProject?._id || '')
   ) || [];
   const confirmedPayment = projectPayments.find(p => p.status === 'confirmed' || p.status === 'completed');
   const paymentStatus = confirmedPayment ? 'paid' : (projectPayments.length || selectedProject?.status === 'pending') ? 'pending' : 'none';
   const totalPaid = confirmedPayment?.totalAmount || 0;

   if ((authLoading || paymentsLoading || projectsLoading || companiesLoading || usersLoading) && (filteredProjects?.length === 0)) return <PageLoader />;

   return (
      <div className="min-h-screen p-6 lg:p-10 bg-gray-50/50 dark:bg-black text-gray-900 dark:text-white font-sans">
         <div className="max-w-[1600px] mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
               <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t('dashboard_overview')}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('welcome_back_desc')}</p>
               </div>
               <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                  <i className="fa-regular fa-calendar"></i>
                  <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
               </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                  { title: t('new_orders'), value: newOrder, icon: 'fa-folder-plus', color: 'text-blue-500', bg: 'bg-blue-500/10', sub: t('from_system') },
                  { title: t('active_projects'), value: activeProjects, icon: 'fa-layer-group', color: 'text-indigo-500', bg: 'bg-indigo-500/10', sub: `${inProgress} ${t('in_progress_stat')}` },
                  { title: t('today_revenue'), value: `$${todayRevenue}`, icon: 'fa-dollar-sign', color: 'text-green-500', bg: 'bg-green-500/10', sub: `${revenuePercent > 0 ? '+' : ''}${revenuePercent}% ${t('growth')}` },
                  { title: t('team_members'), value: totalMembers, icon: 'fa-users', color: 'text-purple-500', bg: 'bg-purple-500/10', sub: `${onlineMembers} ${t('online')}` },
               ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                     <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform`}>
                           <i className={`fa-solid ${stat.icon}`}></i>
                        </div>
                        {i === 2 && (
                           <div className={`text-xs font-bold px-2 py-1 rounded-lg ${revenuePercent >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
                              {revenuePercent > 0 ? '+' : ''}{revenuePercent}%
                           </div>
                        )}
                     </div>
                     <h3 className="text-gray-500 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.title}</h3>
                     <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">{stat.value}</div>
                     <p className="text-xs text-gray-400 font-medium">{stat.sub}</p>
                  </div>
               ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('revenue_overview')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('monthly_revenue_desc')}</p>
                     </div>
                     <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition focus:ring-2 focus:ring-red-500/20"
                     >
                        <option value="6m">{t('last_6_months')}</option>
                        <option value="1y">{t('last_year')}</option>
                     </select>
                  </div>
                  <div className="w-full h-[350px]">
                     <Plot
                        data={revenueData}
                        layout={revenueLayout}
                        useResizeHandler={true}
                        style={{ width: "100%", height: "100%" }}
                        config={{ displayModeBar: false }}
                     />
                  </div>
               </div>

               <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col">
                  <div className="mb-6">
                     <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {isAdmin ? t('salary_distribution') : t('my_tasks_progress')}
                     </h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isAdmin ? t('per_project_breakdown') : t('personal_earnings_breakdown')}
                     </p>
                  </div>
                  <div className="flex-1 w-full min-h-[250px]">
                     <Plot
                        data={salaryData}
                        layout={salaryLayout}
                        useResizeHandler
                        style={{ width: '100%', height: '100%' }}
                        config={{ displayModeBar: false }}
                     />
                  </div>
                  <div className="mt-6 space-y-3">
                     {isAdmin ? (
                        <>
                           {(isTeamLead ? [
                              { label: t('execution_pool_label'), value: salaryTotals.execution, color: 'bg-green-500' },
                              { label: t('lead_management_label'), value: salaryTotals.leadManagement, color: 'bg-purple-500' }
                           ] : [
                              { label: t('execution_pool_label'), value: salaryTotals.execution, color: 'bg-green-500' },
                              { label: t('lead_management_label'), value: salaryTotals.leadManagement, color: 'bg-purple-500' },
                              { label: t('admin_label'), value: salaryTotals.admin, color: 'bg-red-500' },
                              { label: t('company'), value: salaryTotals.company, color: 'bg-blue-500' }
                           ]).map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm group">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${item.color} ring-2 ring-white dark:ring-zinc-900 shadow-sm`}></div>
                                    <span className="font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.label}</span>
                                 </div>
                                 <span className="font-bold text-gray-900 dark:text-white">${item.value.toFixed(2)}</span>
                              </div>
                           ))}
                        </>
                     ) : (
                        // Worker Stats List
                        Object.entries(personalStats.earnings).map(([key, val], i) => (
                           <div key={key} className="flex items-center justify-between text-sm">
                              <span className="capitalize text-gray-600 dark:text-gray-400">{t(key)}</span>
                              <span className="font-bold text-gray-900 dark:text-white">${val.toFixed(2)}</span>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>

            {/* Recent Orders & Team */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
               <div className="xl:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('recent_orders_bot')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('bot_desc')}</p>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead>
                           <tr className="bg-gray-50/50 dark:bg-zinc-800/50 text-left">
                              {['order_id', 'date', 'client', 'description', 'amount', 'status', 'action'].map(h => (
                                 <th key={h} className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{t(h)}</th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                           {recentOrders.map(project => (
                              <tr key={project._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                 <td className="px-8 py-5 text-sm font-bold text-gray-900 dark:text-white">#{project._id.slice(-6).toUpperCase()}</td>
                                 <td className="px-8 py-5 text-sm text-gray-500 font-medium">{new Date(project.createdAt).toLocaleDateString()}</td>
                                 <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-black text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                          {project.createdBy?.name?.[0] || 'U'}
                                       </div>
                                       <span className="text-sm font-semibold text-gray-900 dark:text-white">{project.createdBy?.name || 'Unknown'}</span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-5 text-sm text-gray-500 truncate max-w-[200px]">{project.title}</td>
                                 <td className="px-8 py-5 text-sm font-bold text-gray-900 dark:text-white">{getAmountByProject(project)}</td>
                                 <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusBadge(project.status)}`}>
                                       {project.status}
                                    </span>
                                 </td>
                                 <td className="px-8 py-5">
                                    <button onClick={() => setSelectedProject(project)} className="text-gray-400 hover:text-red-500 transition-colors">
                                       <i className="fa-solid fa-eye"></i>
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm p-8">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('team_members')}</h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                     {((() => {
                        const allUsers = users?.data?.users || [];
                        const userDataObj = user?.data?.user || user;
                        const isAdmin = userDataObj?.role === 'super_admin';
                        return allUsers
                           .filter(u => u._id !== userDataObj?._id)
                           .filter(u => isAdmin || u.role !== 'super_admin');
                     })() || []).map(u => {
                        const isOnlineUser = u.isActive && isOnline(u.lastLogin);
                        return (
                           <div key={u._id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all group">
                              <div className="relative">
                                 <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                                 <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white dark:border-zinc-800 rounded-full ${isOnlineUser ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-gray-900 dark:text-white truncate">{u.name}</h4>
                                 <p className="text-xs text-red-500 font-semibold uppercase tracking-wide">{u.role.replace('_', ' ')}</p>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
         </div>

         {/* Project Detail Modal */}
         {selectedProject && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setSelectedProject(null)}></div>
               <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full p-8 relative z-10 shadow-2xl border border-gray-100 dark:border-zinc-800">
                  <div className="flex justify-between items-start mb-8">
                     <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${selectedProject.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                           {selectedProject.priority} Project
                        </span>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white mt-3">{selectedProject.title}</h2>
                     </div>
                     <button onClick={() => setSelectedProject(null)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition">
                        <i className="fa-solid fa-times"></i>
                     </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                     <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Status</div>
                        <div className={`font-bold capitalize ${selectedProject.status === 'completed' ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>{selectedProject.status.replace('_', ' ')}</div>
                     </div>
                     <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Budget</div>
                        <div className="font-mono font-bold text-gray-900 dark:text-white">${selectedProject.budget}</div>
                     </div>
                     <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Deadline</div>
                        <div className="font-bold text-gray-900 dark:text-white">{new Date(selectedProject.deadline).toLocaleDateString()}</div>
                     </div>
                     <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Payment</div>
                        <div className={`font-bold capitalize ${paymentStatus === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>{paymentStatus}</div>
                     </div>
                  </div>

                  <div>
                     <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">Description</h3>
                     <p className="text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl">
                        {selectedProject.description}
                     </p>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Dashboard;
