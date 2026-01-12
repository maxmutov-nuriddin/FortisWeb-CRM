/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useUserStore } from '../store/user.store';
import { useAuthStore } from '../store/auth.store';
import { useCompanyStore } from '../store/company.store';
import { toast } from 'react-toastify';
import PageLoader from '../components/loader/PageLoader';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../store/task.store';
import { useProjectStore } from '../store/project.store';
import { useSettingsStore } from '../store/settings.store';
import { usePaymentStore } from '../store/payment.store';

const Profiles = () => {
   const { t } = useTranslation();
   const { user: currentUser } = useAuthStore();
   const { theme } = useSettingsStore();
   const userData = useMemo(() => currentUser?.data?.user || currentUser?.user || currentUser, [currentUser]);
   const isSuperAdmin = useMemo(() => userData?.role === 'super_admin', [userData]);

   const { users, isLoading: usersLoading, getUsersByCompany, getAllUsers, createUser, updateUser, deleteUser, updateUserStatus } = useUserStore();
   const { companies, selectedCompany, isLoading: companiesLoading, getCompanies, getCompanyById, addTeam, addTeamMemberDirect, removeTeamMember, deleteTeam: deleteTeamAction } = useCompanyStore();
   const { tasks, getTasksByProjects, isLoading: tasksLoading } = useTaskStore();
   const { projects, getProjectsByCompany, getAllProjects, isLoading: projectsLoading } = useProjectStore();
   const { payments, getPaymentsByCompany, getAllPayments, isLoading: paymentsLoading } = usePaymentStore();

   const isLoading = usersLoading || companiesLoading || tasksLoading || projectsLoading || paymentsLoading;

   const [activeTab, setActiveTab] = useState('members');
   const [filter, setFilter] = useState('All Members');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
   const [isEditMode, setIsEditMode] = useState(false);
   const [selectedUser, setSelectedUser] = useState(null);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [selectedTeamCompanyId, setSelectedTeamCompanyId] = useState('');
   const [expandedTeamId, setExpandedTeamId] = useState(null);
   const [isCreatingTeam, setIsCreatingTeam] = useState(false);
   const [teamMemberFilter, setTeamMemberFilter] = useState('All');

   // Form States
   const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      phone: '',
      position: '',
      companyId: ''
   });

   const [teamFormData, setTeamFormData] = useState({
      name: '',
      teamLeadId: '',
      description: '',
      companyId: ''
   });

   const fetchData = async () => {
      if (!userData) return;
      const userCompanyId = String(userData.company?._id || userData.company?.id || userData.company || '');

      if (isSuperAdmin) {
         const camps = await getCompanies();
         const companyList = camps?.data?.companies || camps || [];
         const validIds = companyList.map(c => c._id).filter(Boolean);
         if (validIds.length > 0) {
            getAllUsers(validIds);
            getAllPayments(validIds);
            getAllProjects(validIds);
         }
      } else if (userCompanyId) {
         getCompanyById(userCompanyId);
         getUsersByCompany(userCompanyId);
         getPaymentsByCompany(userCompanyId);
         getProjectsByCompany(userCompanyId);
      }
   };

   useEffect(() => {
      fetchData();
   }, [userData, isSuperAdmin]);

   useEffect(() => {
      // Auto-set company ID for company admins when team modal opens
      if (isTeamModalOpen && !isSuperAdmin && userData) {
         const userCompanyId = String(userData.company?._id || userData.company || '');
         if (userCompanyId && !teamFormData.companyId) {
            setTeamFormData(prev => ({ ...prev, companyId: userCompanyId }));
            setSelectedTeamCompanyId(userCompanyId);
         }
      }
   }, [isTeamModalOpen, isSuperAdmin, userData]);

   // Get user's teams (same logic as Dashboard)
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

   const rawUserList = useMemo(() => {
      const all = users?.data?.users || (Array.isArray(users) ? users : []);
      if (isSuperAdmin || userData?.role === 'company_admin') return all.filter(u => u.role !== 'super_admin' || isSuperAdmin);

      const memberIds = new Set();

      // Add team members and team leads
      allTeams.forEach(t => {
         if (t.members) t.members.forEach(m => memberIds.add(String(m?._id || m.user?._id || m.user || m)));
         memberIds.add(String(t.teamLead?._id || t.teamLead || ''));
      });

      // Add current user
      memberIds.add(String(userData?._id));

      // Add company admin(s) of the user's company
      const userCompanyId = String(userData?.company?._id || userData?.company || '');
      all.forEach(u => {
         if (u.role === 'company_admin') {
            const uCompanyId = String(u.company?._id || u.company || '');
            if (uCompanyId === userCompanyId) {
               memberIds.add(String(u._id));
            }
         }
      });

      return all.filter(u => memberIds.has(String(u._id)));
   }, [users, isSuperAdmin, userData, allTeams]);

   const userList = useMemo(() => {
      let result = rawUserList;
      if (filter !== 'All Members' && filter !== t('all_members')) {
         result = result.filter(u => {
            const r = u.role;
            if (filter === 'Admins') return r === 'company_admin' || r === 'super_admin';
            if (filter === 'Team Leads') return r === 'team_lead';
            if (filter === 'Developers') return r === 'backend' || r === 'frontend';
            return true;
         });
      }
      if (searchQuery) {
         const q = searchQuery.toLowerCase();
         result = result.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
      }
      return result;
   }, [rawUserList, filter, searchQuery, t]);

   const stats = useMemo(() => {
      const all = rawUserList;
      return {
         total: all.length,
         active: all.filter(u => u.isActive).length,
         leads: all.filter(u => u.role === 'team_lead').length,
      };
   }, [rawUserList]);

   const roleChartData = useMemo(() => {
      const all = rawUserList;
      const roles = [
         { id: 'backend', label: 'Backend', color: '#10B981' },
         { id: 'frontend', label: 'Frontend', color: '#3B82F6' },
         { id: 'team_lead', label: 'Leads', color: '#8B5CF6' },
         { id: 'company_admin', label: 'Admins', color: '#EF4444' },
         { id: 'marketer', label: 'Marketing', color: '#F59E0B' }
      ];

      return roles.map(r => ({
         name: r.label,
         value: all.filter(u => u.role === r.id).length,
         fill: r.color
      })).filter(item => item.value > 0);
   }, [rawUserList]);

   const roleLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      showlegend: false,
      height: 120,
      width: 120
   };

   const openModal = (user = null) => {
      if (user) {
         setIsEditMode(true);
         setSelectedUser(user);
         setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'employee',
            phone: user.phone || '',
            position: user.position || '',
            companyId: String(user.company?._id || user.company || '')
         });
      } else {
         setIsEditMode(false);
         setSelectedUser(null);
         setFormData({
            name: '',
            email: '',
            password: '',
            role: 'employee',
            phone: '',
            position: '',
            companyId: userData?.role === 'super_admin' ? '' : (userData?.company?._id || userData?.company || '')
         });
      }
      setIsModalOpen(true);
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         if (isEditMode && selectedUser) {
            const updateData = { ...formData };
            if (!updateData.password) delete updateData.password;
            await updateUser(selectedUser._id, updateData);
            toast.success('User updated successfully');
         } else {
            await createUser(formData);
            toast.success('User created successfully');
         }
         setIsModalOpen(false);
         fetchData();
      } catch (err) {
         toast.error(err.response?.data?.message || 'Operation failed');
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleDelete = async (id) => {
      if (window.confirm('Delete this user?')) {
         try {
            await deleteUser(id);
            toast.success('User deleted');
            fetchData();
         } catch (err) {
            toast.error('Failed to delete user');
         }
      }
   };

   const handleCreateTeam = async (e) => {
      e.preventDefault();
      setIsCreatingTeam(true);
      try {
         const companyId = isSuperAdmin
            ? teamFormData.companyId
            : String(userData?.company?._id || userData?.company || '');

         if (!companyId) {
            toast.error('Please select a company');
            setIsCreatingTeam(false);
            return;
         }

         // Verify team lead belongs to the company
         const teamLead = rawUserList.find(u => u._id === teamFormData.teamLeadId);
         const teamLeadCompanyId = String(teamLead?.company?._id || teamLead?.company || '');

         console.log('Debug Team Creation:', {
            companyId,
            teamLeadId: teamFormData.teamLeadId,
            teamLead,
            teamLeadCompanyId,
            match: teamLeadCompanyId === companyId
         });

         if (teamLeadCompanyId !== companyId) {
            toast.error('Selected team lead does not belong to this company');
            setIsCreatingTeam(false);
            return;
         }

         const teamData = {
            name: teamFormData.name,
            teamLeadId: teamFormData.teamLeadId,
            description: teamFormData.description
         };

         console.log('Sending team data:', { companyId, teamData });

         await addTeam(companyId, teamData);

         toast.success('Team created successfully');
         setTeamFormData({ name: '', teamLeadId: '', description: '', companyId: '' });
         fetchData();
      } catch (err) {
         toast.error(err.response?.data?.message || 'Failed to create team');
      } finally {
         setIsCreatingTeam(false);
      }
   };

   const handleAddTeamMember = async (teamId, userId, companyId) => {
      try {
         await addTeamMemberDirect(companyId, { teamId, userId });
         toast.success('Member added to team');
         fetchData();
      } catch (err) {
         toast.error('Failed to add member');
      }
   };

   const handleRemoveTeamMember = async (companyId, teamId, userId) => {
      if (window.confirm('Remove this member from the team?')) {
         try {
            await removeTeamMember(companyId, teamId, userId);
            toast.success('Member removed');
            fetchData();
         } catch (err) {
            toast.error('Failed to remove member');
         }
      }
   };

   const handleDeleteTeam = async (companyId, teamId) => {
      if (window.confirm('Delete this team? This action cannot be undone.')) {
         try {
            await deleteTeamAction(companyId, teamId);
            toast.success('Team deleted');
            fetchData();
         } catch (err) {
            toast.error('Failed to delete team');
         }
      }
   };

   if (isLoading && userList.length === 0) return <PageLoader />;

   return (
      <div className="min-h-screen p-6 lg:p-10 bg-gray-50/50 dark:bg-black text-gray-900 dark:text-white font-sans">
         <div className="max-w-[1600px] mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t('team_profiles')}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('profiles_desc')}</p>
               </div>

               {(userData?.role === 'super_admin' || userData?.role === 'company_admin') && (
                  <div className="flex gap-3">
                     <button
                        onClick={() => setIsTeamModalOpen(true)}
                        className="bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-800 px-6 py-3 rounded-xl text-sm font-bold transition shadow-sm"
                     >
                        Manage Teams
                     </button>
                     <button
                        onClick={() => openModal()}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5 flex items-center gap-2"
                     >
                        <i className="fa-solid fa-user-plus"></i>
                        <span>{t('add_new_member')}</span>
                     </button>
                  </div>
               )}
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Members</p>
                     <p className="text-3xl font-black text-gray-100 dark:text-white">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-blue-500">
                     <i className="fa-solid fa-users text-xl"></i>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Now</p>
                     <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.active}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-green-500">
                     <i className="fa-solid fa-circle-check text-xl"></i>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Team Leads</p>
                     <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.leads}</p>
                  </div>

                  {/* Mini Role Chart */}
                  <div className="w-16 h-16">
                     <div className="w-[60px] h-[60px]">
                        <PieChart width={60} height={60}>
                           <Pie
                              data={roleChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={18}
                              outerRadius={30}
                              paddingAngle={4}
                              dataKey="value"
                              stroke="none"
                           >
                              {roleChartData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                           </Pie>
                           <Tooltip
                              content={({ active, payload }) => {
                                 if (active && payload && payload.length) {
                                    return (
                                       <div className="bg-white/90 dark:bg-black/90 backdrop-blur text-xs rounded-lg p-2 shadow-lg border border-gray-100 dark:border-zinc-800 z-50">
                                          <span className="font-bold block" style={{ color: payload[0].payload.fill }}>{payload[0].name}</span>
                                          <span className="font-black text-gray-900 dark:text-white">{payload[0].value}</span>
                                       </div>
                                    );
                                 }
                                 return null;
                              }}
                           />
                        </PieChart>
                     </div>
                  </div>
               </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[500px]">

               {/* Toolbar */}
               <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex gap-2 p-1 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800">
                     {['All Members', 'Admins', 'Team Leads', 'Developers'].map((f) => (
                        <button
                           key={f}
                           onClick={() => setFilter(f)}
                           className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === f
                              ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                              }`}
                        >
                           {f}
                        </button>
                     ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                     <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                     <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                     />
                  </div>
               </div>

               {/* Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                  {userList.map(user => (
                     <div key={user._id} className="group bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-red-500/30 transition-all hover:shadow-lg relative">
                        <div className="flex items-start justify-between">
                           <div className="flex gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300 shadow-inner">
                                 {user.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                 <h3 className="text-base font-bold text-gray-900 dark:text-white">{user.name}</h3>
                                 <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{user.role.replace('_', ' ').toUpperCase()}</p>
                                 <span className={`inline-flex w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                 <span className="text-[10px] text-gray-400 ml-2">{user.isActive ? 'Active' : 'Inactive'}</span>
                              </div>
                           </div>

                           {/* Actions Dropdown Trigger (Simplified for this view) */}
                           {(isSuperAdmin || userData?.role === 'company_admin') && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => openModal(user)} className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-blue-500 shadow-sm border border-gray-100 dark:border-zinc-700">
                                    <i className="fa-solid fa-pen text-xs"></i>
                                 </button>
                                 <button onClick={() => handleDelete(user._id)} className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-red-500 shadow-sm border border-gray-100 dark:border-zinc-700">
                                    <i className="fa-solid fa-trash text-xs"></i>
                                 </button>
                              </div>
                           )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 grid grid-cols-2 gap-4 text-xs">
                           <div>
                              <span className="text-gray-400 block mb-0.5">Contact</span>
                              <span className="text-gray-700 dark:text-gray-300 font-medium truncate block" title={user.email}>{user.email}</span>
                           </div>
                           <div>
                              <span className="text-gray-400 block mb-0.5">Joined</span>
                              <span className="text-gray-700 dark:text-gray-300 font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>

               {userList.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                     <i className="fa-solid fa-users-slash text-4xl mb-3 opacity-30"></i>
                     <p>No members found matching your search.</p>
                  </div>
               )}
            </div>
         </div>

         {/* Modals - Simplified */}
         {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
               <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-lg p-8 relative z-10 shadow-2xl border border-gray-100 dark:border-zinc-800">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
                     {isEditMode ? 'Edit Profile' : 'New Member'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                     <input name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl" required />
                     <input name="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} onBlur={e => { const val = e.target.value; if (val && !val.includes('@')) { setFormData({ ...formData, email: val.trim() + '@gmail.com' }); } }} placeholder="Email Address" className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl" required />
                     {!isEditMode && (
                        <div className="relative">
                           <input
                              name="password"
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={e => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Password"
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl pr-12"
                              required
                           />
                           <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                           >
                              {showPassword ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}
                           </button>
                        </div>
                     )}
                     <select name="role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl">
                        <option value="employee">Employee</option>
                        <option value="backend">Backend Developer</option>
                        <option value="frontend">Frontend Developer</option>
                        <option value="team_lead">Team Lead</option>
                        <option value="company_admin">Admin</option>
                     </select>

                     {isSuperAdmin && (
                        <select
                           name="companyId"
                           value={formData.companyId}
                           onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                           className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl"
                           required
                        >
                           <option value="">Select Company</option>
                           {companies?.data?.companies?.map(company => (
                              <option key={company._id} value={company._id}>
                                 {company.name}
                              </option>
                           ))}
                        </select>
                     )}
                     <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all mt-4 flex items-center justify-center gap-2 ${isSubmitting
                           ? 'bg-gray-400 cursor-not-allowed'
                           : 'bg-red-600 hover:bg-red-700 hover:-translate-y-0.5'
                           }`}
                     >
                        {isSubmitting ? (
                           <>
                              <i className="fa-solid fa-circle-notch animate-spin"></i>
                              <span>{isEditMode ? 'Saving...' : 'Creating...'}</span>
                           </>
                        ) : (
                           <span>{isEditMode ? 'Save Changes' : 'Create Account'}</span>
                        )}
                     </button>
                  </form>
                  <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500">
                     <i className="fa-solid fa-times"></i>
                  </button>
               </div>
            </div>
         )}

         {/* Team Management Modal */}
         {isTeamModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
               <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm" onClick={() => setIsTeamModalOpen(false)}></div>
               <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 relative z-10 shadow-2xl border border-gray-100 dark:border-zinc-800 custom-scrollbar">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                     <i className="fa-solid fa-users-gear text-red-500"></i>
                     Manage Teams
                  </h2>

                  {/* Create Team Form */}
                  <div className="bg-gray-50 dark:bg-black/40 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-zinc-800">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create New Team</h3>
                     <form onSubmit={handleCreateTeam} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {isSuperAdmin && (
                              <select
                                 value={teamFormData.companyId}
                                 onChange={e => {
                                    setTeamFormData({ ...teamFormData, companyId: e.target.value });
                                    setSelectedTeamCompanyId(e.target.value);
                                 }}
                                 className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl"
                                 required
                              >
                                 <option value="">Select Company</option>
                                 {companies?.data?.companies?.map(company => (
                                    <option key={company._id} value={company._id}>
                                       {company.name}
                                    </option>
                                 ))}
                              </select>
                           )}
                           <input
                              value={teamFormData.name}
                              onChange={e => setTeamFormData({ ...teamFormData, name: e.target.value })}
                              placeholder="Team Name"
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl"
                              required
                           />
                           <select
                              value={teamFormData.teamLeadId}
                              onChange={e => setTeamFormData({ ...teamFormData, teamLeadId: e.target.value })}
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl"
                              required
                           >
                              <option value="">Select Team Lead</option>
                              {rawUserList
                                 .filter(u => {
                                    const companyId = isSuperAdmin ? teamFormData.companyId : (userData?.company?._id || userData?.company);
                                    const userCompanyId = String(u.company?._id || u.company || '');
                                    return u.role === 'team_lead' && userCompanyId === companyId;
                                 })
                                 .map(user => (
                                    <option key={user._id} value={user._id}>
                                       {user.name}
                                    </option>
                                 ))}
                           </select>
                           <input
                              value={teamFormData.description}
                              onChange={e => setTeamFormData({ ...teamFormData, description: e.target.value })}
                              placeholder="Description (optional)"
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl"
                           />
                        </div>
                        <button
                           type="submit"
                           disabled={isCreatingTeam}
                           className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${isCreatingTeam
                              ? 'bg-gray-400 cursor-not-allowed text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20'
                              }`}
                        >
                           {isCreatingTeam ? (
                              <>
                                 <i className="fa-solid fa-circle-notch animate-spin"></i>
                                 <span>Creating...</span>
                              </>
                           ) : (
                              <>
                                 <i className="fa-solid fa-plus"></i>
                                 <span>Create Team</span>
                              </>
                           )}
                        </button>
                     </form>
                  </div>

                  {/* Teams List */}
                  <div className="space-y-4">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white">Existing Teams</h3>
                     {(() => {
                        const companyIdStr = String(userData?.company?._id || userData?.company || '');
                        const companyList = companies?.data?.companies || [];
                        let relevantCompanies = isSuperAdmin ? companyList : companyList.filter(c => String(c._id) === companyIdStr);

                        // Fallback for company admin if list is empty but selectedCompany is loaded
                        if (!isSuperAdmin && relevantCompanies.length === 0 && selectedCompany && String(selectedCompany._id) === companyIdStr) {
                           relevantCompanies = [selectedCompany];
                        }

                        if (relevantCompanies.length === 0) {
                           return <p className="text-gray-500 text-center py-8">No companies found</p>;
                        }

                        return relevantCompanies.map(company => {
                           const teams = company.teams || [];
                           if (teams.length === 0 && !isSuperAdmin) return null;

                           return (
                              <div key={company._id} className="bg-gray-50 dark:bg-black/40 rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
                                 <h4 className="text-md font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <i className="fa-solid fa-building text-blue-500"></i>
                                    {company.name}
                                 </h4>

                                 {teams.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No teams yet</p>
                                 ) : (
                                    <div className="space-y-3">
                                       {teams.map(team => {
                                          const isExpanded = expandedTeamId === team._id;
                                          const teamMembers = team.members || [];
                                          const teamLead = rawUserList.find(u => u._id === (team.teamLead?._id || team.teamLead));

                                          const availableMembers = rawUserList.filter(u => {
                                             const userCompanyId = String(u.company?._id || u.company || '');
                                             const isSameCompany = userCompanyId === company._id;

                                             // Apply role filter
                                             let matchesFilter = true;
                                             if (teamMemberFilter === 'Admins') matchesFilter = u.role === 'company_admin' || u.role === 'super_admin';
                                             else if (teamMemberFilter === 'Team Leads') matchesFilter = u.role === 'team_lead';
                                             else if (teamMemberFilter === 'Developers') matchesFilter = u.role === 'backend' || u.role === 'frontend';

                                             const isNotMember = !teamMembers.some(m => {
                                                const memberId = String(m?._id || m.user?._id || m.user || m || '');
                                                return memberId === u._id;
                                             });
                                             // FIX: Exclude Admins from team membership to ensure hierarchy
                                             const isNotAdmin = u.role !== 'company_admin' && u.role !== 'super_admin';

                                             return isSameCompany && matchesFilter && isNotMember && isNotAdmin;
                                          });

                                          return (
                                             <div key={team._id} className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800">
                                                <div className="flex items-center justify-between">
                                                   <div className="flex-1">
                                                      <h5 className="font-bold text-gray-900 dark:text-white">{team.name}</h5>
                                                      {team.description && (
                                                         <p className="text-sm text-gray-500 mt-1">{team.description}</p>
                                                      )}
                                                      <p className="text-xs text-gray-400 mt-1">
                                                         Lead: {teamLead?.name || 'Unknown'}
                                                      </p>
                                                   </div>
                                                   <div className="flex gap-2">
                                                      <button
                                                         onClick={() => setExpandedTeamId(isExpanded ? null : team._id)}
                                                         className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors"
                                                      >
                                                         <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                                      </button>
                                                      {(isSuperAdmin || userData?.role === 'company_admin') && (
                                                         <button
                                                            onClick={() => handleDeleteTeam(company._id, team._id)}
                                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                                                         >
                                                            <i className="fa-solid fa-trash text-xs"></i>
                                                         </button>
                                                      )}
                                                   </div>
                                                </div>

                                                {isExpanded && (
                                                   <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                                                      <div className="flex items-center justify-between mb-3">
                                                         <h6 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                            Members ({teamMembers.length})
                                                         </h6>
                                                      </div>

                                                      {/* Role Filters for Team Member Addition */}
                                                      <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                                                         {['All', 'Team Leads', 'Developers'].map(role => (
                                                            <button
                                                               key={role}
                                                               onClick={() => setTeamMemberFilter(role)}
                                                               className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${teamMemberFilter === role
                                                                  ? 'bg-red-500 text-white'
                                                                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                                  }`}
                                                            >
                                                               {role}
                                                            </button>
                                                         ))}
                                                      </div>

                                                      {availableMembers.length > 0 && (
                                                         <select
                                                            onChange={(e) => {
                                                               if (e.target.value) {
                                                                  handleAddTeamMember(team._id, e.target.value, company._id);
                                                                  e.target.value = '';
                                                               }
                                                            }}
                                                            className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-lg w-full mb-3"
                                                         >
                                                            <option value="">+ Add Member ({teamMemberFilter})</option>
                                                            {availableMembers.map(user => (
                                                               <option key={user._id} value={user._id}>
                                                                  [{user.role.replace('_', ' ')}] {user.name}
                                                               </option>
                                                            ))}
                                                         </select>
                                                      )}

                                                      {teamMembers.length === 0 ? (
                                                         <p className="text-xs text-gray-400">No members yet</p>
                                                      ) : (
                                                         <div className="space-y-2">
                                                            {teamMembers.map(member => {
                                                               const memberUser = rawUserList.find(u => {
                                                                  const memberId = String(member?._id || member.user?._id || member.user || member || '');
                                                                  return u._id === memberId;
                                                               });
                                                               if (!memberUser) return null;

                                                               return (
                                                                  <div key={memberUser._id} className="flex items-center justify-between bg-gray-50 dark:bg-black/40 rounded-lg p-2">
                                                                     <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                                                           {memberUser.name?.[0]?.toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                           <p className="text-sm font-medium text-gray-900 dark:text-white">{memberUser.name}</p>
                                                                           <p className="text-xs text-gray-500">{memberUser.role.replace('_', ' ')}</p>
                                                                        </div>
                                                                     </div>
                                                                     <button
                                                                        onClick={() => handleRemoveTeamMember(company._id, team._id, memberUser._id)}
                                                                        className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                                                     >
                                                                        <i className="fa-solid fa-times text-xs"></i>
                                                                     </button>
                                                                  </div>
                                                               );
                                                            })}
                                                         </div>
                                                      )}
                                                   </div>
                                                )}
                                             </div>
                                          );
                                       })}
                                    </div>
                                 )}
                              </div>
                           );
                        });
                     })()}
                  </div>

                  <button onClick={() => setIsTeamModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500">
                     <i className="fa-solid fa-times"></i>
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default Profiles;
