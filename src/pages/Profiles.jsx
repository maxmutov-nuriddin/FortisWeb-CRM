/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
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

   const rawUserList = useMemo(() => {
      const all = users?.data?.users || (Array.isArray(users) ? users : []);
      let filtered = isSuperAdmin ? all : all.filter(u => u.role !== 'super_admin');

      if (!isSuperAdmin && userData?.role !== 'company_admin') {
         // Filter logic for lower roles - usually only see their team or company depending on strictness
         // For now, simplify to company users
         const userCompanyId = String(userData.company?._id || userData.company || '');
         filtered = filtered.filter(u => String(u.company?._id || u.company || '') === userCompanyId);
      }
      return filtered;
   }, [users, isSuperAdmin, userData]);

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

   const roleData = useMemo(() => {
      const all = rawUserList;
      const roles = ['backend', 'frontend', 'team_lead', 'company_admin', 'marketer'];
      const values = roles.map(r => all.filter(u => u.role === r).length);
      return [{
         type: 'doughnut',
         values,
         labels: ['Backend', 'Frontend', 'Leads', 'Admins', 'Marketing'],
         marker: { colors: ['#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B'] },
         textinfo: 'none',
         hole: 0.6
      }];
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
                     <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.total}</p>
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
                     <Plot
                        data={[{ ...roleData[0], type: 'pie', textinfo: 'none' }]}
                        layout={{ ...roleLayout, height: 60, width: 60, margin: { t: 0, b: 0, l: 0, r: 0 } }}
                        config={{ displayModeBar: false }}
                     />
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
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openModal(user)} className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-blue-500 shadow-sm border border-gray-100 dark:border-zinc-700">
                                 <i className="fa-solid fa-pen text-xs"></i>
                              </button>
                              {(isSuperAdmin || userData?.role === 'company_admin') && (
                                 <button onClick={() => handleDelete(user._id)} className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-red-500 shadow-sm border border-gray-100 dark:border-zinc-700">
                                    <i className="fa-solid fa-trash text-xs"></i>
                                 </button>
                              )}
                           </div>
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
                        <input name="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Password" className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl" required />
                     )}
                     <select name="role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl">
                        <option value="employee">Employee</option>
                        <option value="backend">Backend Developer</option>
                        <option value="frontend">Frontend Developer</option>
                        <option value="team_lead">Team Lead</option>
                        <option value="company_admin">Admin</option>
                     </select>
                     <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all mt-4">
                        {isEditMode ? 'Save Changes' : 'Create Account'}
                     </button>
                  </form>
                  <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500">
                     <i className="fa-solid fa-times"></i>
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default Profiles;
