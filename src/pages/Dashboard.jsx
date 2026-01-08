/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { useProjectStore } from '../store/project.store';
import { useAuthStore } from '../store/auth.store';
import MiniLoader from '../components/loader/MiniLoader';
import PageLoader from '../components/loader/PageLoader';
import { usePaymentStore } from '../store/payment.store';
import { isOnline, isToday, isYesterday } from '../utils/date';
import { useUserStore } from '../store/user.store';
import { useCompanyStore } from '../store/company.store';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
   const { t, i18n } = useTranslation();
   //! DATA
   const { user, isLoading: authLoading, error: authError } = useAuthStore();
   const { users, getUsersByCompany, getAllUsers, isLoading: usersLoading } = useUserStore();
   const { projects, getProjectsByCompany, getAllProjects, isLoading: projectsLoading, error: projectsError } = useProjectStore();
   const { payments, getPaymentsByCompany, getAllPayments, isLoading: paymentsLoading, error: paymentsError } = usePaymentStore();
   const { companies, selectedCompany, getCompanies, getCompanyById, isLoading: companiesLoading, } = useCompanyStore();

   //! State
   const [newOrder, setNewOrder] = useState([])
   const [activeProjects, setActiveProjects] = useState([])
   const [inProgress, setInProgress] = useState([])
   const [totalProjects, setTotalProjects] = useState([])
   const [todayRevenue, setTodayRevenue] = useState(0)
   const [revenuePercent, setRevenuePercent] = useState(0)
   const [todayProjectsCount, setTodayProjectsCount] = useState(0)
   const [todayProjects, setTodayProjects] = useState([])
   const [totalMembers, setTotalMembers] = useState(0)
   const [onlineMembers, setOnlineMembers] = useState(0)
   const [activeRoles, setActiveRoles] = useState(0)
   const [period, setPeriod] = useState('6m')
   const [selectedProject, setSelectedProject] = useState(null)
   const [salaryTotals, setSalaryTotals] = useState({
      execution: 0,
      leadManagement: 0,
      admin: 0,
      company: 0
   })

   const userData = useMemo(() => user?.data?.user || user?.user || user, [user]);
   const isSuperAdmin = useMemo(() => userData?.role === 'super_admin', [userData]);

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
   }, [companies, selectedCompany, userData, isSuperAdmin]);

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

   // Grafik 2
   useEffect(() => {
      if (!filteredPayments) return

      let totalRevenue = 0

      filteredPayments.forEach(p => {
         // Using robust amount check similar to Payments.jsx
         const amount = Number(p.totalAmount) || Number(p.amount) || 0
         totalRevenue += amount
      })

      // 56% Execution Pool, 14% Lead Management, 10% Admin, 20% Company
      setSalaryTotals({
         execution: totalRevenue * 0.56,
         leadManagement: totalRevenue * 0.14,
         admin: totalRevenue * 0.1,
         company: totalRevenue * 0.2
      })
   }, [filteredPayments])

   console.log(filteredPayments);


   const salaryData = [{
      type: 'pie',
      labels: [t('execution_pool_label'), t('lead_management_label'), t('admin_label'), t('company')],
      values: [salaryTotals.execution, salaryTotals.leadManagement, salaryTotals.admin, salaryTotals.company],
      marker: {
         colors: ['#10B981', '#8B5CF6', '#FF0000', '#3B82F6']
      },
      textinfo: 'label+value',
      textfont: { color: '#FFFFFF', size: 12 },
      hovertemplate: '%{label}: $%{value}<extra></extra>'
   }]


   const salaryLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   }


   //! Grafik
   const filterPaymentsByPeriod = (payments, period) => {
      const now = new Date()

      return payments.filter(p => {
         const date = new Date(p.createdAt)

         if (period === '6m') {
            const d = new Date()
            d.setMonth(now.getMonth() - 6)
            return date >= d
         }

         if (period === '1y') {
            const d = new Date()
            d.setFullYear(now.getFullYear() - 1)
            return date >= d
         }

         return true
      })
   }

   const getMonthlyRevenue = (payments) => {
      const map = {}

      payments.forEach(p => {
         const d = new Date(p.createdAt)
         const key = `${d.getFullYear()}-${d.getMonth()}`
         map[key] = (map[key] || 0) + Number(p.totalAmount)
      })

      const keys = Object.keys(map).sort((a, b) => new Date(a) - new Date(b))

      return {
         labels: keys.map(k => {
            const [y, m] = k.split('-')
            return new Date(y, m).toLocaleString(i18n.language || 'en', { month: 'short' })
         }),
         values: keys.map(k => map[k])
      }
   }

   const revenueChart = useMemo(() => {
      if (!filteredPayments) return { labels: [], values: [] }

      const filtered = filterPaymentsByPeriod(
         filteredPayments,
         period
      )

      return getMonthlyRevenue(filtered)
   }, [filteredPayments, period])

   const revenueData = [{
      type: 'scatter',
      mode: 'lines',
      x: revenueChart.labels,
      y: revenueChart.values,
      line: { color: '#FF0000', width: 3 },
      fill: 'tozeroy',
      fillcolor: 'rgba(255,0,0,0.1)'
   }]

   const revenueLayout = {
      autosize: true,
      margin: { t: 20, r: 20, b: 40, l: 60 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      xaxis: { color: '#9CA3AF' },
      yaxis: { color: '#9CA3AF' },
      showlegend: false
   }

   // ===================== USERS =====================
   useEffect(() => {
      let usersList = filteredUsers;
      if (!usersList || usersList.length === 0) {
         setActiveRoles(0)
         setTotalMembers(0)
         setOnlineMembers(0)
         return
      }

      const activeRolesCount = new Set(
         usersList
            .filter(u => u.isActive)
            .map(u => u.role)
      ).size

      const onlineCount = usersList.filter(u =>
         isOnline(u.lastLogin)
      ).length

      setActiveRoles(activeRolesCount)
      setTotalMembers(usersList.length)
      setOnlineMembers(onlineCount)
   }, [filteredUsers])


   // ===================== PAYMENTS =====================
   useEffect(() => {
      const paymentsList = filteredPayments;
      if (!paymentsList || paymentsList.length === 0) {
         setTodayRevenue(0)
         setRevenuePercent(0)
         setTodayProjectsCount(0)
         return
      }

      // 💰 Сегодня
      const todayPayments = paymentsList.filter(p =>
         isToday(p.createdAt)
      )

      const todaySum = todayPayments.reduce(
         (sum, p) => sum + Number(p.totalAmount),
         0
      )

      // 💰 Вчера
      const yesterdaySum = paymentsList
         .filter(p => isYesterday(p.createdAt))
         .reduce((sum, p) => sum + Number(p.totalAmount), 0)

      // 📊 Процент роста
      const percent = yesterdaySum
         ? Math.round(((todaySum - yesterdaySum) / yesterdaySum) * 100)
         : 100

      // 📦 Кол-во проектов сегодня
      const projectsCount = new Set(
         todayPayments.map(p => p.project?._id)
      ).size

      setTodayRevenue(todaySum)
      setRevenuePercent(percent)
      setTodayProjectsCount(projectsCount)
   }, [filteredPayments])





   // ===================== DATA INITIALIZATION =====================
   useEffect(() => {
      const initDashboard = async () => {
         if (!userData) return;

         const companyId = userData.company?._id || userData.company;
         const role = userData.role;

         if (role === 'super_admin') {
            try {
               const res = await getCompanies();
               const companiesList = res?.data?.companies || res?.companies || (Array.isArray(res) ? res : []);
               const finalCompanies = companiesList.length > 0 ? companiesList : (companies?.data?.companies || []);
               const companyIds = finalCompanies.map(c => c._id).filter(Boolean);

               if (companyIds.length > 0) {
                  getAllProjects(companyIds);
                  getAllPayments(companyIds);
                  getAllUsers(companyIds);
               }
            } catch (error) {
               console.error('Error fetching data for super_admin:', error);
            }
         } else if (companyId) {
            getCompanyById(companyId);
            getProjectsByCompany(companyId);
            getPaymentsByCompany(companyId);
            getUsersByCompany(companyId);
         }
      };

      initDashboard();
   }, [userData, getCompanies, getCompanyById, getAllProjects, getAllPayments, getAllUsers, getProjectsByCompany, getPaymentsByCompany, getUsersByCompany]);

   useEffect(() => {
      if (users?.partialFailure) {
         toast.warning('Some dashboard data could not be fully loaded. Check console for details.', {
            toastId: 'dashboard-partial-load',
            autoClose: 5000
         });
      }
   }, [users?.partialFailure]);


   // ===================== PROJECTS =====================
   useEffect(() => {
      const projectsData = filteredProjects;
      if (!Array.isArray(projectsData) || projectsData.length === 0) {
         setTodayProjects([])
         setNewOrder(0)
         setActiveProjects(0)
         setInProgress(0)
         setTotalProjects(0)
         return
      }

      setTodayProjects(
         projectsData.filter(p => isToday(p.createdAt))
      )

      setNewOrder(
         projectsData.filter(p => p.status === 'pending').length
      )

      setActiveProjects(
         projectsData.filter(p =>
            ['in_progress', 'review', 'revision'].includes(p.status)
         ).length
      )

      setInProgress(
         projectsData.filter(p => p.status === 'in_progress').length
      )

      setTotalProjects(projectsData.length)
   }, [filteredProjects])


   //! Recent Order

   const recentOrders = useMemo(() => {
      if (!filteredProjects || filteredProjects.length === 0) return []

      return [...filteredProjects]
         .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
         .slice(0, 5)
   }, [filteredProjects])

   const getAmountByProject = (project) => {
      if (!project.payment || !filteredPayments) return '—'

      const payment = filteredPayments.find(
         p => p._id === project.payment
      )

      return payment ? `$${payment.totalAmount}` : '—'
   }

   const statusBadge = (status) => {
      switch (status) {
         case 'pending':
            return 'bg-yellow-500 bg-opacity-20 text-yellow-500'
         case 'in_progress':
            return 'bg-blue-500 bg-opacity-20 text-blue-500'
         case 'completed':
            return 'bg-green-500 bg-opacity-20 text-green-500'
         default:
            return 'bg-gray-500 bg-opacity-20 text-gray-400'
      }
   }

   // Modal Payment

   const projectPayments = (payments?.data?.payments || (Array.isArray(payments) ? payments : [])).filter(
      p => {
         const pId = String(p.project?._id || p.project || '');
         return pId === String(selectedProject?._id || '');
      }
   ) || []

   const confirmedPayment = projectPayments.find(p => p.status === 'confirmed' || p.status === 'completed')

   const paymentStatus = confirmedPayment
      ? 'paid'
      : projectPayments.length
         ? 'pending'
         : 'none'

   const totalPaid = confirmedPayment?.totalAmount || 0

   // ===================== ERRORS =====================
   useEffect(() => {
      if (projectsError) console.error(projectsError)
      if (authError) console.error(authError)
      if (paymentsError) console.error(paymentsError)
   }, [projectsError, authError, paymentsError])

   if (authLoading && paymentsLoading && projectsLoading && companiesLoading && usersLoading) return (
      <PageLoader />
   );

   return (

      <>
         {selectedProject && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
               <div className="bg-dark-secondary rounded-xl w-full max-w-3xl p-6 relative">

                  <button
                     onClick={() => setSelectedProject(null)}
                     className="absolute top-4 right-4 text-gray-400 hover:text-white"
                  >
                     ✕
                  </button>

                  <h2 className="text-xl font-semibold text-white mb-4">
                     {selectedProject.title}
                  </h2>

                  {/* BASIC INFO */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">

                     <div>
                        <span className="text-gray-400">Client</span>
                        <div>{selectedProject.createdBy?.name}</div>
                     </div>

                     <div>
                        <span className="text-gray-400">Project Status</span>
                        <div className="capitalize">{selectedProject.status}</div>
                     </div>

                     <div>
                        <span className="text-gray-400">Priority</span>
                        <div className="capitalize">{selectedProject.priority}</div>
                     </div>

                     <div>
                        <span className="text-gray-400">Source</span>
                        <div className="capitalize">{selectedProject.source}</div>
                     </div>

                     <div>
                        <span className="text-gray-400">Start Date</span>
                        <div>{new Date(selectedProject.startDate).toLocaleDateString()}</div>
                     </div>

                     <div>
                        <span className="text-gray-400">Deadline</span>
                        <div>{new Date(selectedProject.deadline).toLocaleDateString()}</div>
                     </div>

                     <div>
                        <span className="text-gray-400">Budget</span>
                        <div>${selectedProject.budget || 0}</div>
                     </div>

                     <div>
                        <span className="text-gray-400">Payment ID</span>
                        <div>{selectedProject.payment || '—'}</div>
                     </div>
                  </div>

                  {/* PAYMENT STATUS */}
                  <div className="mt-5">
                     <span className="text-gray-400 text-sm block mb-1">Payment Status</span>

                     {paymentStatus === 'paid' && (
                        <div className="space-y-1">
                           <div className="text-green-500 font-medium">
                              ✅ Paid — ${totalPaid}
                           </div>

                           <div className="text-xs text-gray-400">
                              Confirmed by:{" "}
                              <span className="text-gray-300">
                                 {confirmedPayment.confirmedBy?.name || '—'}
                              </span>
                           </div>

                           <div className="text-xs text-gray-400">
                              Date:{" "}
                              {new Date(
                                 confirmedPayment.confirmedAt || confirmedPayment.paymentDate
                              ).toLocaleString()}
                           </div>
                        </div>
                     )}

                     {paymentStatus === 'pending' && (
                        <div className="text-yellow-500 font-medium">
                           ⏳ Waiting confirmation
                        </div>
                     )}

                     {paymentStatus === 'none' && (
                        <div className="text-red-500 font-medium">
                           ❌ No payments
                        </div>
                     )}
                  </div>

                  {/* DESCRIPTION */}
                  <div className="mt-4">
                     <span className="text-gray-400 text-sm block mb-1">Description</span>
                     <div className="bg-dark-tertiary p-4 rounded text-gray-200">
                        {selectedProject.description}
                     </div>
                  </div>

                  {/* MEMBERS */}
                  <div className="mt-4">
                     <span className="text-gray-400 text-sm block mb-2">Assigned Members</span>

                     {selectedProject.assignedMembers.length === 0 ? (
                        <div className="text-gray-500 text-sm">No members assigned</div>
                     ) : (
                        <div className="flex gap-3 flex-wrap">
                           {(() => {
                              const usersList = users?.data?.users || (Array.isArray(users) ? users : []);
                              // Дедупликация участников по ID
                              const seen = new Set();
                              const uniqueMembers = selectedProject.assignedMembers.filter(m => {
                                 const id = String(m.user?._id || m.user || m._id || m);
                                 if (seen.has(id)) return false;
                                 seen.add(id);
                                 return true;
                              });

                              return uniqueMembers.map((m, idx) => {
                                 const userId = String(m.user?._id || m.user || m._id || m);
                                 const memberData = usersList.find(u => String(u._id) === userId);
                                 const name = memberData?.name || m.user?.name || m.name || 'Unknown User';
                                 const role = memberData?.role || m.role || 'Member';

                                 return (
                                    <div
                                       key={idx}
                                       className="bg-dark-tertiary px-3 py-2 rounded-lg text-sm text-white flex items-center space-x-3 border border-gray-800"
                                    >
                                       <div className="w-8 h-8 rounded-full bg-dark-accent/20 flex items-center justify-center text-xs text-dark-accent font-bold border border-dark-accent/10">
                                          {name.charAt(0).toUpperCase()}
                                       </div>
                                       <div className="flex flex-col">
                                          <span className="font-medium">{name}</span>
                                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                                             {role || role.replace('_', ' ')}
                                          </span>
                                       </div>
                                    </div>
                                 );
                              });
                           })()}
                        </div>
                     )}
                  </div>
                  {/* STATS */}
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-300">
                     <div>
                        <span className="text-gray-400">Files</span>
                        <div>{selectedProject.files.length}</div>
                     </div>
                     <div>
                        <span className="text-gray-400">Results</span>
                        <div>{selectedProject.results.length}</div>
                     </div>
                     <div>
                        <span className="text-gray-400">Revisions</span>
                        <div>{selectedProject.revisionRequests.length}</div>
                     </div>
                  </div>

               </div>
            </div>
         )}
         <div className="p-8 space-y-8">
            <div id="dashboard-header-section">
               <h1 className="text-3xl font-bold text-white mb-2">{t('dashboard_overview')}</h1>
               <p className="text-gray-400">{t('welcome_back_desc')}</p>
            </div>

            <div id="stats-cards-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
                  <div className="flex items-center justify-between mb-4">
                     <div className="w-12 h-12 bg-dark-accent bg-opacity-20 rounded-lg flex items-center justify-center">
                        <i className="fa-brands fa-telegram text-dark-accent text-2xl"></i>
                     </div>
                     <span className="text-green-500 text-sm font-medium">+{todayProjects.length ?? 0} {t('new')}</span>
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">{t('new_orders')}</h3>
                  <p className="text-3xl font-bold text-white">
                     {newOrder ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{t('from_system')}</p>
               </div>

               <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
                  <div className="flex items-center justify-between mb-4">
                     <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-folder-open text-blue-500 text-2xl"></i>
                     </div>
                     <span className="text-blue-500 text-sm font-medium">{activeProjects ?? 0} {t('active')}</span>
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">{t('total_projects')}</h3>
                  <p className="text-3xl font-bold text-white">
                     {totalProjects ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{inProgress ?? 0} {t('in_progress_stat')}</p>
               </div>

               <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
                  <div className="flex items-center justify-between mb-4">
                     <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-dollar-sign text-green-500 text-2xl"></i>
                     </div>
                     <span className={`${revenuePercent >= 0 ? "text-green-500" : "text-dark-accent"} text-sm font-medium`}> {revenuePercent >= 0 ? '+' : ''}
                        {revenuePercent ?? 0}%</span>
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">{t('today_revenue')}</h3>
                  <div className="h-[36px] flex items-center">
                     <span className="text-3xl font-bold text-white">
                        ${todayRevenue ?? 0}
                     </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{t('from_system')} {todayProjectsCount} {t('projects').toLowerCase()}</p>
               </div>

               <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6 hover:border-dark-accent transition">
                  <div className="flex items-center justify-between mb-4">
                     <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-users text-purple-500 text-2xl"></i>
                     </div>
                     <span className="text-purple-500 text-sm font-medium">{onlineMembers} {t('online')}</span>
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">{t('team_members')}</h3>
                  <p className="text-3xl font-bold text-white">{totalMembers}</p>
                  <p className="text-xs text-gray-500 mt-2">{activeRoles} {t('roles_active')}</p>
               </div>
            </div>

            <div id="charts-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="col-span-1 lg:col-span-2 bg-dark-secondary border border-gray-800 rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                     <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{t('revenue_overview')}</h3>
                        <p className="text-sm text-gray-400">{t('monthly_revenue_desc')}</p>
                     </div>
                     <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent"
                     >
                        <option value="6m">{t('last_6_months')}</option>
                        <option value="1y">{t('last_year')}</option>
                        <option value="all">{t('all_time')}</option>
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
                     <h3 className="text-lg font-semibold text-white mb-1">{t('salary_distribution')}</h3>
                     <p className="text-sm text-gray-400">{t('per_project_breakdown')}</p>
                  </div>
                  <div className="w-full h-[300px]">
                     <Plot
                        data={salaryData}
                        layout={salaryLayout}
                        useResizeHandler
                        style={{ width: '100%', height: '100%' }}
                        config={{ displayModeBar: false }}
                     />
                  </div>
                  <div className="mt-4 space-y-2">
                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                           <div className="w-3 h-3 rounded-full bg-green-500"></div>
                           <span className="text-gray-400">{t('execution_pool_label')}</span>
                        </div>
                        <span className="text-white font-medium">${salaryTotals?.execution?.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                           <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                           <span className="text-gray-400">{t('lead_management_label')}</span>
                        </div>
                        <span className="text-white font-medium">${salaryTotals?.leadManagement?.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                           <div className="w-3 h-3 rounded-full bg-red-500"></div>
                           <span className="text-gray-400">{t('admin_label')}</span>
                        </div>
                        <span className="text-white font-medium">${salaryTotals?.admin?.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                           <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                           <span className="text-gray-400">{t('company')} (20%)</span>
                        </div>
                        <span className="text-white font-medium">${salaryTotals?.company?.toFixed(2)}</span>
                     </div>
                  </div>
               </div>
            </div>

            <div id="orders-section">
               <div className="bg-dark-secondary border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{t('recent_orders_bot')}</h3>
                        <p className="text-sm text-gray-400">{t('bot_desc')}</p>
                     </div>
                     {/* <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                           <i className="fa-solid fa-plus"></i>
                           <span>Manual Order</span>
                        </button> */}
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead className="bg-dark-tertiary">
                           <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('order_id')}</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('date')}</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('client')}</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('description')}</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('amount')}</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('status')}</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('action')}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                           {recentOrders.map(project => (
                              <tr
                                 key={project._id}
                                 className="hover:bg-dark-tertiary transition"
                              >
                                 <td className="px-6 py-4 text-sm text-white font-medium">
                                    #{project._id.slice(-6)}
                                 </td>

                                 <td className="px-6 py-4 text-sm text-gray-400">
                                    {new Date(project.createdAt).toLocaleDateString()}
                                 </td>

                                 <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                       <div className="w-8 h-8 rounded-full bg-dark-accent flex items-center justify-center text-xs text-white">
                                          {project.createdBy?.name?.[0] || 'U'}
                                       </div>
                                       <span className="text-sm text-white">
                                          {project.createdBy?.name || 'Unknown'}
                                       </span>
                                    </div>
                                 </td>

                                 <td className="px-6 py-4 text-sm text-gray-400">
                                    {project.title}
                                 </td>

                                 <td className="px-6 py-4 text-sm text-white font-semibold">
                                    {getAmountByProject(project)}
                                 </td>

                                 <td className="px-6 py-4">
                                    <span
                                       className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(project.status)}`}
                                    >
                                       {project.status}
                                    </span>
                                 </td>

                                 <td className="px-6 py-4">
                                    <button
                                       onClick={() => setSelectedProject(project)}
                                       className="bg-dark-accent hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium transition"
                                    >
                                       {t('view')}
                                    </button>
                                 </td>
                              </tr>
                           ))}
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
                     {/* <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                           <i className="fa-solid fa-user-plus"></i>
                           <span>Add Member</span>
                        </button> */}
                  </div>
                  <div className="space-y-4">
                     {((() => {
                        const allUsers = users?.data?.users || [];
                        const userDataObj = user?.data?.user || user;
                        const isAdmin = userDataObj?.role === 'super_admin';
                        return allUsers
                           .filter(u => u._id !== userDataObj?._id) // не показываем себя
                           .filter(u => isAdmin || u.role !== 'super_admin');
                     })() || []).map(u => {
                        const isOnline = u.isActive === true

                        return (
                           <div
                              key={u._id}
                              className="flex items-center space-x-4 p-4 bg-dark-tertiary rounded-lg hover:bg-gray-800 transition"
                           >
                              <img
                                 src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`}
                                 className="w-12 h-12 rounded-full border-2 border-dark-accent"
                              />

                              <div className="flex-1">
                                 <h4 className="text-white font-medium">{u.name}</h4>
                                 <p className="text-xs text-gray-400">{u.email}</p>
                                 <p className="text-sm text-dark-accent capitalize">
                                    {u.role.replace('_', ' ')}
                                 </p>
                              </div>

                              <div className="text-right">
                                 <div className="flex items-center space-x-1 justify-end">
                                    <div
                                       className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'
                                          }`}
                                    ></div>
                                    <span
                                       className={`text-xs ${isOnline ? 'text-green-500' : 'text-gray-400'
                                          }`}
                                    >
                                       {isOnline ? 'Online' : 'Offline'}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        )
                     })}
                  </div>

               </div>
            </div>
         </div >
      </>
   );
};

export default Dashboard;
