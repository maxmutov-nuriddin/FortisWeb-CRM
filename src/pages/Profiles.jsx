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
   const { companies, selectedCompany, isLoading: companiesLoading, getCompanies, getCompanyById, addTeam, addTeamMemberDirect, deleteTeam: deleteTeamAction } = useCompanyStore();
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
   const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
   const [selectedTeamId, setSelectedTeamId] = useState(null);
   const [selectedTeamCompanyId, setSelectedTeamCompanyId] = useState(null);
   const [memberToAddId, setMemberToAddId] = useState('');
   const [openMenuUserId, setOpenMenuUserId] = useState(null);
   // Move Team State
   const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
   const [moveUserId, setMoveUserId] = useState(null);
   const [newTeamId, setNewTeamId] = useState('');
   const [showPassword, setShowPassword] = useState(false);

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
         getCompanies().then(async camps => {
            const companyList = camps?.data?.companies || camps || [];
            if (companyList.length > 0) {
               const validIds = companyList.map(c => c._id).filter(Boolean);
               if (validIds.length > 0) {
                  getAllUsers(validIds);
                  getAllPayments(validIds);
                  const projResult = await getAllProjects(validIds);
                  const projectList = projResult?.data?.projects || projResult || [];
                  const pIds = projectList.map(p => p._id || p.id).filter(Boolean);
                  if (pIds.length > 0) getTasksByProjects(pIds);
               }
            }
         });
      } else if (userCompanyId) {
         // Non-super admins use getCompanyById because getCompanies might be restricted
         getCompanyById(userCompanyId);
         getUsersByCompany(userCompanyId);
         getPaymentsByCompany(userCompanyId);
         getProjectsByCompany(userCompanyId).then(projResult => {
            const projectList = projResult?.data?.projects || projResult || [];
            const pIds = projectList.map(p => p._id || p.id).filter(Boolean);
            if (pIds.length > 0) getTasksByProjects(pIds);
         });
      }
   };

   useEffect(() => {
      fetchData();
   }, [userData, isSuperAdmin, getCompanies, getAllUsers, getUsersByCompany]);

   useEffect(() => {
      if (users?.partialFailure) {
         toast.warning('Some company data could not be loaded due to server errors. Check console for details.', {
            toastId: 'partial-load-warning',
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      }
   }, [users?.partialFailure]);

   const allTeams = useMemo(() => {
      if (!userData) return [];
      const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);
      const userCompanyId = String(userData.company?._id || userData.company?.id || userData.company || '');

      // Merge selectedCompany if available. Some APIs might return it nested or as the obj itself.
      let relevantCompanies = [...companyList];
      const selComp = selectedCompany?.company || selectedCompany?.data?.company || selectedCompany;

      if (selComp && String(selComp._id) === userCompanyId) {
         if (!relevantCompanies.some(c => String(c._id) === userCompanyId)) {
            relevantCompanies.push(selComp);
         } else {
            // Update existing company in list with potentially fresher data from selectedCompany
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
         const company = relevantCompanies.find(c => String(c._id || c.id || '') === userCompanyId);
         const companyTeams = company?.teams?.map(t => ({ ...t, companyName: company.name, companyId: String(company._id || company.id || '') })) || [];

         if (userData?.role === 'company_admin') {
            return companyTeams;
         }

         const currentUserId = String(userData?._id || userData?.id || '');
         // For team_lead, backend, frontend, marketer, designer, employee - show teams they are part of
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

   const rawUserList = useMemo(() => {
      const all = users?.data?.users || (Array.isArray(users) ? users : []);
      const currentUserId = String(userData?._id || userData?.id || '');

      // 1. Initial filter: Hide super_admin from others, AND always hide self
      let filtered = all.filter(u => {
         const uId = String(u._id || u.id || '');
         if (uId === currentUserId) return false;
         if (!isSuperAdmin && u.role === 'super_admin') return false;
         return true;
      });

      // 2. Role-specific subsetting for non-admins
      if (!isSuperAdmin && userData?.role !== 'company_admin') {
         // Show only members of their teams
         const myTeams = allTeams;
         const memberIds = new Set();
         myTeams.forEach(t => {
            if (t.members) {
               t.members.forEach(m => {
                  const mId = String(m?._id || m.user?._id || m.user || m || '');
                  if (mId) memberIds.add(mId);
               });
            }
            const leadId = String(t.teamLead?._id || t.teamLead || '');
            if (leadId) memberIds.add(leadId);
         });

         filtered = filtered.filter(u => {
            const uId = String(u._id || u.id || '');
            return uId && memberIds.has(uId);
         });
      }
      return filtered;
   }, [users, isSuperAdmin, userData, allTeams]);

   const userList = useMemo(() => {
      const list = rawUserList;
      if (filter === 'All Members' || filter === t('all_members')) return list;
      return list.filter(u => {
         if (filter === 'Admins' || filter === t('admins')) return u.role === 'company_admin' || u.role === 'super_admin';
         if (filter === 'Team Leads' || filter === t('team_lead')) return u.role === 'team_lead';
         if (filter === 'Backend' || filter === t('backend')) return u.role === 'backend';
         if (filter === 'Frontend' || filter === t('frontend')) return u.role === 'frontend';
         if (filter === 'Marketing' || filter === t('marketing')) return u.role === 'marketing' || u.role === 'marketer';
         return true;
      });
   }, [rawUserList, filter]);

   const stats = useMemo(() => {
      const all = rawUserList;
      return {
         total: all.length,
         active: all.filter(u => u.isActive).length,
         leads: all.filter(u => u.role === 'team_lead').length,
         leave: all.filter(u => !u.isActive).length,
         teams: allTeams.length
      };
   }, [rawUserList, allTeams]);

   const roleData = useMemo(() => {
      const all = rawUserList;
      const roles = ['backend', 'frontend', 'team_lead', 'company_admin', 'marketer'];
      const labels = [t('backend'), t('frontend'), t('team_lead'), t('admins'), t('marketing')];
      const values = roles.map(r => all.filter(u => u.role === r).length);

      return [{
         type: 'pie',
         labels,
         values,
         marker: { colors: ['#10B981', '#06B6D4', '#8B5CF6', '#3B82F6', '#F59E0B'] },
         textinfo: 'label+percent',
         textfont: { color: '#FFFFFF', size: 11 },
         hovertemplate: `%{label}: %{value} ${t('members_stat')}<extra></extra>`
      }];
   }, [rawUserList]);

   const roleLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      showlegend: false,
      font: {
         color: theme === 'dark' ? '#fff' : '#111827'
      }
   };

   const performanceData = useMemo(() => {
      const allTasks = Array.isArray(tasks) ? tasks : tasks?.data?.tasks || [];
      const allUsers = rawUserList;

      const roles = ['backend', 'frontend', 'team_lead', 'company_admin', 'marketer'];
      const labels = [t('backend'), t('frontend'), t('team_lead'), t('admins'), t('marketing')];

      const values = roles.map(role => {
         const roleUsers = allUsers.filter(u => u.role === role);
         const roleUserIds = new Set(roleUsers.map(u => String(u._id || u.id)));

         const roleTasks = allTasks.filter(task => {
            const assigneeId = String(task.assignedTo?._id || task.assignedTo || '');
            return roleUserIds.has(assigneeId);
         });

         if (roleTasks.length === 0) return 0;
         const completed = roleTasks.filter(t => t.status === 'completed').length;
         return Math.round((completed / roleTasks.length) * 100);
      });

      return [{
         type: 'bar',
         x: labels,
         y: values,
         marker: { color: ['#10B981', '#06B6D4', '#8B5CF6', '#3B82F6', '#F59E0B'] },
         hovertemplate: `%{x}: %{y}% ${t('success_rate')}<extra></extra>`
      }];
   }, [tasks, rawUserList, t]);

   const performanceLayout = {
      autosize: true,
      xaxis: {
         title: '',
         gridcolor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
         color: theme === 'dark' ? '#9CA3AF' : '#4B5563'
      },
      yaxis: {
         title: t('success_rate_percent'),
         gridcolor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
         color: theme === 'dark' ? '#9CA3AF' : '#4B5563',
         range: [0, 100]
      },
      margin: { t: 20, r: 20, b: 60, l: 60 },
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      showlegend: false
   };

   const getCompanyRates = useMemo(() => (comp) => {
      const realComp = comp?.company || comp?.data?.company || comp || {};
      const rates = realComp.distributionRates || realComp.settings || realComp || {};
      return {
         admin: Number(rates.customAdminRate || rates.adminRate || 10) / 100,
         team: Number(rates.customTeamRate || rates.teamRate || 70) / 100,
         company: Number(rates.customCommissionRate || rates.companyRate || 20) / 100
      };
   }, []);

   const calculateUserEarnings = React.useCallback((user) => {
      const uId = String(user._id || user.id || '');
      const role = user.role;
      const uCompId = String(user.company?._id || user.company || '');

      const allPayments = payments?.data?.payments || (Array.isArray(payments) ? payments : []);
      const allProjects = projects?.data?.projects || (Array.isArray(projects) ? projects : []);
      const allTasks = Array.isArray(tasks) ? tasks : (tasks?.data?.tasks || tasks?.tasks || []);
      const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);

      let total = 0;

      allPayments.forEach(p => {
         const pCompId = String(p.company?._id || p.company || '');
         if (uCompId && pCompId !== uCompId && role !== 'super_admin') return;

         const pAmount = Number(p.totalAmount) || Number(p.amount) || 0;
         const pProjectId = String(p.project?._id || p.project || '');
         const proj = allProjects.find(pr => String(pr._id) === pProjectId);
         if (!proj) return;

         const pComp = companyList.find(c => String(c._id) === pCompId);
         const rates = getCompanyRates(pComp);

         if (role === 'company_admin') {
            total += (pAmount * rates.admin);
         } else if (role === 'super_admin') {
            total += (pAmount * rates.company);
         } else if (role === 'team_lead') {
            const isLead = String(proj.teamLead?._id || proj.teamLead || '') === uId;
            if (isLead) {
               total += (pAmount * rates.team);
            }
         } else {
            // Worker/Employee
            const projTasks = allTasks.filter(t => String(t.project?._id || t.project || '') === pProjectId && t.status === 'completed');
            const totalWeight = projTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);
            if (totalWeight > 0) {
               const myTasks = projTasks.filter(t => String(t.assignedTo?._id || t.assignedTo || '') === uId);
               const myWeight = myTasks.reduce((sum, t) => sum + (Number(t.weight) || 1), 0);
               const executionPool = pAmount * rates.team * 0.8;
               total += (myWeight / totalWeight) * executionPool;
            }
         }
      });

      return Math.round(total);
   }, [payments, projects, tasks, companies, getCompanyRates]);

   const styles = {
      modalOverlay: "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm",
      modalContent: "bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl",
      input: "w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent transition placeholder-gray-500",
      label: "block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5",
      btnPrimary: "bg-dark-accent hover:bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed",
      btnSecondary: "bg-gray-200 dark:bg-dark-tertiary hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition border border-gray-300 dark:border-gray-700"
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
            companyId: String(user.company?._id || user.company?.id || user.company || '')
         });
      } else {
         setIsEditMode(false);
         setSelectedUser(null);
         const companyData = userData?.company;
         const defaultCompanyId = userData?.role === 'super_admin' ? '' : String(companyData?._id || companyData?.id || companyData || '');
         setFormData({
            name: '',
            email: '',
            password: '',
            role: 'employee',
            phone: '',
            position: '',
            companyId: defaultCompanyId
         });
      }
      setIsModalOpen(true);
   };

   const openTeamModal = () => {
      const companyData = currentUser?.company || currentUser?.data?.user?.company;
      const defaultCompanyId = currentUser?.role === 'super_admin' ? '' : (companyData?._id || companyData || '');
      setTeamFormData({ name: '', teamLeadId: '', description: '', companyId: String(defaultCompanyId) });
      setIsTeamModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setIsTeamModalOpen(false);
      setIsMemberModalOpen(false);
      resetForm();
   };

   const resetForm = () => {
      setFormData({
         name: '',
         email: '',
         password: '',
         role: 'employee',
         phone: '',
         position: '',
         companyId: ''
      });
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         if (isEditMode && selectedUser) {
            const updateData = { ...formData };
            if (!updateData.password) delete updateData.password;
            await updateUser(selectedUser._id, updateData);
            toast.success('User updated successfully!');
         } else {
            if (!formData.password) {
               toast.error('Password is required for new users', {
                  position: 'top-right',
                  autoClose: 5000,
                  closeOnClick: false,
                  draggable: false,
                  theme: 'dark',
               });
               setIsSubmitting(false);
               return;
            }
            const submitData = {
               ...formData,
               companyId: String(formData.companyId || '')
            };
            await createUser(submitData);
            toast.success('User created successfully!', {
               position: 'top-right',
               autoClose: 5000,
               closeOnClick: false,
               draggable: false,
               theme: 'dark',
            });
         }
         closeModal();
      } catch (error) {
         console.error(error);
         toast.error(error.response?.data?.message || 'Failed to save user', {
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

   const handleTeamSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         await addTeam(teamFormData.companyId, {
            name: teamFormData.name,
            teamLeadId: teamFormData.teamLeadId,
            description: teamFormData.description
         });
         toast.success('Team created successfully!', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
         closeModal();
      } catch (error) {
         toast.error(error.response?.data?.message || 'Failed to create team', {
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

   const handleDelete = async (userId) => {
      const ToastContent = ({ closeToast }) => (
         <div>
            <p>Are you sure you want to delete this member?</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
               <button
                  onClick={async () => {
                     closeToast();
                     try {
                        await deleteUser(userId);
                        toast.success('User deleted successfully', {
                           position: 'top-right',
                           autoClose: 5000,
                           closeOnClick: false,
                           draggable: false,
                           theme: 'dark',
                        });
                     } catch (error) {
                        toast.error('Failed to delete user', {
                           position: 'top-right',
                           autoClose: 5000,
                           closeOnClick: false,
                           draggable: false,
                           theme: 'dark',
                        });
                     }
                  }}
                  style={{
                     padding: '5px 15px',
                     background: '#ef4444',
                     border: 'none',
                     borderRadius: '4px',
                     color: 'white',
                     cursor: 'pointer',
                     fontSize: '14px'
                  }}
               >
                  Delete
               </button>
               <button
                  onClick={closeToast}
                  style={{
                     padding: '5px 15px',
                     background: '#6b7280',
                     border: 'none',
                     borderRadius: '4px',
                     color: 'white',
                     cursor: 'pointer',
                     fontSize: '14px'
                  }}
               >
                  Cancel
               </button>
            </div>
         </div>
      );

      toast.info(<ToastContent />, {
         position: 'top-right',
         autoClose: false,
         closeOnClick: false,
         draggable: false,
         theme: 'dark',
      });
   };

   const handleDeleteTeam = async (companyId, teamId) => {
      const ToastContent = ({ closeToast }) => (
         <div>
            <p>Are you sure you want to delete this team?</p>
            <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
               This will NOT delete team members, only the team organization.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
               <button
                  onClick={async () => {
                     closeToast();
                     try {
                        await deleteTeamAction(companyId, teamId);
                        toast.success('Team deleted successfully', {
                           position: 'top-right',
                           autoClose: 5000,
                           closeOnClick: false,
                           draggable: false,
                           theme: 'dark',
                        });
                     } catch (error) {
                        console.error('Delete team error:', error);
                        toast.error(error.response?.data?.message || 'Failed to delete team', {
                           position: 'top-right',
                           autoClose: 5000,
                           closeOnClick: false,
                           draggable: false,
                           theme: 'dark',
                        });
                     }
                  }}
                  style={{
                     padding: '5px 15px',
                     background: '#ef4444',
                     border: 'none',
                     borderRadius: '4px',
                     color: 'white',
                     cursor: 'pointer',
                     fontSize: '14px'
                  }}
               >
                  Delete
               </button>
               <button
                  onClick={closeToast}
                  style={{
                     padding: '5px 15px',
                     background: '#6b7280',
                     border: 'none',
                     borderRadius: '4px',
                     color: 'white',
                     cursor: 'pointer',
                     fontSize: '14px'
                  }}
               >
                  Cancel
               </button>
            </div>
         </div>
      );

      toast.info(<ToastContent />, {
         position: 'top-right',
         autoClose: false,
         closeOnClick: false,
         draggable: false,
         theme: 'dark',
      });
   };

   const openMoveTeamModal = (userId) => {
      setMoveUserId(userId);
      setNewTeamId('');
      setOpenMenuUserId(null); // Close menu
      setIsMoveModalOpen(true);
   };

   const handleConfirmMoveTeam = async () => {
      if (!newTeamId) {
         toast.error('Please select a team');
         return;
      }
      setIsSubmitting(true);
      try {
         await updateUser(moveUserId, { team: newTeamId });
         toast.success('User moved to new team');
         setIsMoveModalOpen(false);
         fetchData(); // Refresh list
      } catch (error) {
         console.error(error);
         toast.error(error.response?.data?.message || 'Failed to move user');
      } finally {
         setIsSubmitting(false);
      }
   };

   const toggleStatus = async (userId) => {
      try {
         await updateUserStatus(userId);
         toast.success('Status updated', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      } catch (error) {
         toast.error('Failed to update status', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      }
   };

   const handleAddMemberToTeam = (teamId, companyId) => {
      setSelectedTeamId(teamId);
      setSelectedTeamCompanyId(companyId);
      setMemberToAddId('');
      setIsMemberModalOpen(true);
   };

   const handleConfirmAddMember = async () => {
      if (!memberToAddId) {
         toast.error('Please select a member', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
         return;
      }
      setIsSubmitting(true);
      try {
         await addTeamMemberDirect(selectedTeamCompanyId, { teamId: selectedTeamId, userId: memberToAddId });
         toast.success('Member added to team', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
         setIsMemberModalOpen(false);
      } catch (error) {
         toast.error(error.response?.data?.message || 'Failed to add member', {
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

   if (isLoading && userList?.length === 0) return <PageLoader />;

   if (!isLoading && userList.length === 0 && !users?.partialFailure && !isSuperAdmin) {
      // Optional: Show "No data" message if list is empty and no error
   }

   return (
      <div className="p-8 space-y-8">
         <div id="profiles-header-section">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('team_profiles')}</h1>
                  <p className="text-gray-500 dark:text-gray-400">{t('profiles_desc')}</p>
               </div>
               <div className="flex items-center space-x-3">
                  {(userData?.role === 'super_admin' || userData?.role === 'company_admin') && (
                     <>
                        <button onClick={() => openModal()} className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                           <i className="fa-solid fa-user-plus"></i>
                           <span>{t('add_new_member')}</span>
                        </button>
                        <button onClick={() => openTeamModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                           <i className="fa-solid fa-people-group"></i>
                           <span>{t('create_team')}</span>
                        </button>
                     </>
                  )}
               </div>
            </div>
         </div>

         <div id="profiles-stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-dark-accent transition shadow-sm dark:shadow-none">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-users text-blue-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('total_members')}</h3>
               <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-dark-accent transition shadow-sm dark:shadow-none">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-check text-green-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('active_now')}</h3>
               <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
            <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-dark-accent transition shadow-sm dark:shadow-none">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-tie text-purple-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('team_lead')}</h3>
               <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.leads}</p>
            </div>
            <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-dark-accent transition shadow-sm dark:shadow-none">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-user-clock text-yellow-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('inactive')}</h3>
               <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.leave}</p>
            </div>
            <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-dark-accent transition shadow-sm dark:shadow-none">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-indigo-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-layer-group text-indigo-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('teams')}</h3>
               <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.teams}</p>
            </div>
         </div>

         <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
               onClick={() => setActiveTab('members')}
               className={`px-8 py-4 text-sm font-medium transition ${activeTab === 'members' ? 'text-dark-accent border-b-2 border-dark-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
               {t('all_members')}
            </button>
            <button
               onClick={() => setActiveTab('teams')}
               className={`px-8 py-4 text-sm font-medium transition ${activeTab === 'teams' ? 'text-dark-accent border-b-2 border-dark-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
               {t('teams')} & {t('department_team')}
            </button>
         </div>

         {activeTab === 'members' ? (
            <>
               <div id="profiles-role-tabs-section" className="bg-gray-100 dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-2 flex flex-wrap gap-2">
                  {[t('all_members'), t('admins'), t('team_lead'), t('backend'), t('frontend'), t('marketing')].map(t_label => (
                     <button
                        key={t_label}
                        onClick={() => setFilter(t_label)}
                        className={`flex-auto px-4 py-2.5 rounded-lg text-sm font-medium transition ${filter === t_label ? 'bg-dark-accent text-white shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                     >
                        {t_label}
                     </button>
                  ))}
               </div>

               <div id="profiles-grid-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userList.map(item => (
                     <div key={item._id} className={`bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-dark-accent dark:hover:border-dark-accent transition shadow-sm dark:shadow-none ${!item.isActive ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between mb-4">
                           <div className="relative">
                              <img
                                 src={item.avatar || `https://ui-avatars.com/api/?name=${item?.name}.jpg`}
                                 alt="Profile"
                                 className={`w-16 h-16 rounded-full border-2 ${item.isActive ? 'border-dark-accent' : 'border-gray-200 dark:border-gray-600'}`}
                              />
                              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-dark-secondary ${item.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                           </div>
                           {(userData?.role === 'super_admin' || userData?.role === 'company_admin') && (
                              <div className="flex items-center space-x-2">
                                 <button onClick={() => openModal(item)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
                                    <i className="fa-solid fa-edit"></i>
                                 </button>
                                 <div className="relative">
                                    <button
                                       onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setOpenMenuUserId(openMenuUserId === item._id ? null : item._id);
                                       }}
                                       className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition p-1"
                                    >
                                       <i className="fa-solid fa-ellipsis-v"></i>
                                    </button>
                                    {openMenuUserId === item._id && (
                                       <div
                                          className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-tertiary border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-20"
                                          onClick={(e) => e.stopPropagation()}
                                       >
                                          <button
                                             onClick={() => {
                                                toggleStatus(item._id);
                                                setOpenMenuUserId(null);
                                             }}
                                             className="w-full text-left px-4 py-3 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center"
                                          >
                                             <i className={`fa-solid ${item.isActive ? 'fa-user-slash' : 'fa-user-check'} mr-2`}></i>
                                             {item.isActive ? t('deactivate') : t('activate')}
                                          </button>
                                          <button
                                             onClick={() => openMoveTeamModal(item._id)}
                                             className="w-full text-left px-4 py-3 text-xs text-blue-500 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-t border-gray-200 dark:border-gray-700 flex items-center"
                                          >
                                             <i className="fa-solid fa-people-arrows mr-2"></i>
                                             {t('move_to_team')}
                                          </button>
                                          <button
                                             onClick={() => {
                                                handleDelete(item._id);
                                                setOpenMenuUserId(null);
                                             }}
                                             className="w-full text-left px-4 py-3 text-xs text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-t border-gray-200 dark:border-gray-700 flex items-center"
                                          >
                                             <i className="fa-solid fa-trash-can mr-2"></i>
                                             {t('delete_member')}
                                          </button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{item.name}</h3>
                        <p className="text-sm text-dark-accent mb-3">{item.position || item.role?.replace('_', ' ')}</p>
                        <div className="space-y-2 mb-4">
                           <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400"><i className="fa-solid fa-envelope w-4"></i><span className="truncate">{item.email}</span></div>
                           <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400"><i className="fa-solid fa-phone w-4"></i><span>{item.phone || t('no_phone')}</span></div>
                        </div>
                        <div className="flex items-center space-x-2 mb-4">
                           <span className={`px-2 py-1 bg-opacity-20 rounded text-xs ${item.role === 'super_admin' ? 'bg-red-500 text-red-500' :
                              item.role === 'company_admin' ? 'bg-blue-500 text-blue-500' :
                                 item.role === 'team_lead' ? 'bg-purple-500 text-purple-500' :
                                    'bg-gray-500 text-gray-500'
                              }`}>{item.role?.replace('_', ' ')}</span>
                           <span className={`px-2 py-1 bg-opacity-20 rounded text-xs ${item.isActive ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`}>
                              {item.isActive ? t('active') : t('inactive')}
                           </span>
                        </div>
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                           <div className="flex items-center justify-between text-xs">
                              {(userData?.role === 'super_admin' || userData?.role === 'company_admin' || item.role === 'company_admin' || item.role === 'super_admin') ? (
                                 <>
                                    <div>
                                       <p className="text-gray-500 dark:text-gray-400 mb-1">{t('salary')}</p>
                                       <p className="text-gray-900 dark:text-white font-semibold">${calculateUserEarnings(item)}</p>
                                    </div>
                                    <div>
                                       {(() => {
                                          // 1. Role Normalization
                                          const rawRole = String(item.role || '').toLowerCase().trim();
                                          const IS_SUPER = rawRole.includes('super_admin') || rawRole.includes('company_admin');
                                          const userId = String(item._id || item.id || '').trim();

                                          // 2. Label Selection
                                          const label = IS_SUPER ? t('company') : t('team');
                                          console.log(item);


                                          // 3. Value Calculation
                                          const cId = String(item.company?._id || item.company || '').trim();
                                          const companyList = companies?.data?.companies || (Array.isArray(companies) ? companies : []);
                                          const compObj = companyList.find(c => String(c._id || c.id || '').trim() === cId) || (selectedCompany?.company || selectedCompany?.data?.company || selectedCompany);

                                          let displayValue = compObj?.name || item.company?.name || 'N/A';

                                          // If not super admin, search all teams for this user
                                          if (!IS_SUPER && userId) {
                                             const foundTeam = allTeams.find(t => {
                                                const isLead = String(t.teamLead?._id || t.teamLead || '').trim() === userId;
                                                const isMem = t.members && t.members.some(m => {
                                                   const mId = String(m?._id || m.user?._id || m.user || m || '').trim();
                                                   return mId === userId;
                                                });
                                                return isLead || isMem;
                                             });
                                             if (foundTeam) displayValue = foundTeam.name;
                                          }

                                          return (
                                             <>
                                                <p className="text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                                                <p className="text-gray-900 dark:text-white font-semibold truncate max-w-[80px]">
                                                   {displayValue}
                                                </p>
                                             </>
                                          );
                                       })()}
                                    </div>
                                 </>
                              ) : null}
                              <div><p className="text-gray-500 dark:text-gray-400 mb-1">{t('created')}</p><p className="text-gray-900 dark:text-white font-semibold">{new Date(item.createdAt).toLocaleDateString([], { month: 'short', year: '2-digit' })}</p></div>
                           </div>
                        </div>
                     </div>
                  ))}
                  {userList.length === 0 && (
                     <div className="col-span-full py-12 text-center text-gray-500 bg-dark-secondary rounded-xl border border-dashed border-gray-800">
                        <i className="fa-solid fa-users-slash text-4xl mb-3"></i>
                        <p>{t('no_members_found')}</p>
                     </div>
                  )}
               </div>
            </>
         ) : (
            <div id="teams-grid-section" className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {allTeams.map(team => (
                  <div key={team._id} className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                     <div className="flex items-center justify-between mb-6">
                        <div>
                           <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{team.name}</h3>
                           <p className="text-xs text-gray-500 dark:text-gray-400">Company: {team.companyName}</p>
                        </div>
                        {(userData?.role === 'super_admin' || userData?.role === 'company_admin') && (
                           <div className="flex items-center space-x-3">
                              <button onClick={() => handleDeleteTeam(team.companyId, team._id)} className="text-gray-500 hover:text-red-500 transition text-sm">
                                 <i className="fa-solid fa-trash-can mr-1"></i>
                              </button>
                              <button onClick={() => handleAddMemberToTeam(team._id, team.companyId)} className="text-dark-accent hover:text-red-600 dark:hover:text-white text-sm font-medium transition">
                                 <i className="fa-solid fa-plus mr-1"></i> {t('add_member')}
                              </button>
                           </div>
                        )}
                     </div>
                     <div className="mb-6">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-3">{t('team_lead')}</p>
                        <div className="flex items-center space-x-3 bg-gray-50 dark:bg-dark-tertiary p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                           <div className="w-10 h-10 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center text-purple-500 font-bold">
                              {(() => {
                                 const leadId = String(team.teamLead?._id || team.teamLead || '');
                                 const company = (companies?.data?.companies || companies || []).find(c => String(c._id) === String(team.companyId));
                                 const leadFound = (company?.employees || rawUserList).find(e => String(e._id) === leadId);
                                 return (leadFound?.name || team.teamLead?.name || '?').charAt(0).toUpperCase();
                              })()}
                           </div>
                           <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                 {(() => {
                                    const leadId = String(team.teamLead?._id || team.teamLead || '');
                                    const company = (companies?.data?.companies || companies || []).find(c => String(c._id) === String(team.companyId));
                                    const leadFound = (company?.employees || rawUserList).find(e => String(e._id) === leadId);
                                    return leadFound?.name || team.teamLead?.name || t('unassigned_lead');
                                 })()}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t('responsible_for_deliverables')}</p>
                           </div>
                        </div>
                     </div>
                     <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-3">Members ({team.members?.length || 0})</p>
                        <div className="grid grid-cols-2 gap-2">
                           {team.members?.map((m, idx) => {
                              const uId = String(m?._id || m.user?._id || m.user || m);
                              const company = (companies?.data?.companies || companies || []).find(c => String(c._id) === String(team.companyId));
                              const empFound = (company?.employees || rawUserList).find(e => String(e._id) === uId);
                              const name = empFound?.name || m.name || m.user?.name || 'Unknown Member';

                              return (
                                 <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-tertiary p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-700 dark:text-white">
                                       {name.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{name}</span>
                                 </div>
                              );
                           })}
                           {(!team.members || team.members.length === 0) && <p className="text-xs text-gray-500 dark:text-gray-600 col-span-2">{t('no_members_in_team')}</p>}
                        </div>
                     </div>
                  </div>
               ))}
               {allTeams.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-dark-secondary rounded-xl border border-dashed border-gray-300 dark:border-gray-800">
                     <i className="fa-solid fa-people-group text-4xl mb-3 opacity-50"></i>
                     <p>{t('no_teams_found_create')}</p>
                  </div>
               )}
            </div>
         )}


         <div id="profiles-chart-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm dark:shadow-none">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('team_dist_role')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('member_breakdown_dept')}</p>
               </div>
               <div className="w-full h-[300px]">
                  <Plot
                     data={roleData}
                     layout={roleLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>

            <div className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm dark:shadow-none">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('performance_overview')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('avg_success_rate_dept')}</p>
               </div>
               <div className="w-full h-[300px]">
                  <Plot
                     data={performanceData}
                     layout={performanceLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>
         </div>

         {/* User Modal */}
         {isModalOpen && (
            <div className={styles.modalOverlay}>
               <div className={styles.modalContent}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEditMode ? t('edit_team_member') : t('add_new_member')}</h2>
                     <button onClick={closeModal} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition text-2xl">&times;</button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className={styles.label}>{t('full_name')}</label>
                           <input
                              type="text" required className={styles.input} placeholder="e.g. John Doe"
                              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                           />
                        </div>
                        <div>
                           <label className={styles.label}>{t('email_address')}</label>
                           <input
                              type="email" required className={styles.input} placeholder="john@example.com"
                              value={formData.email}
                              onChange={e => setFormData({ ...formData, email: e.target.value })}
                              onBlur={e => {
                                 const val = e.target.value;
                                 if (val && !val.includes('@')) {
                                    setFormData({ ...formData, email: val.trim() + '@gmail.com' });
                                 }
                              }}
                           />
                           <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                              Domain @gmail.com will be added automatically if missing
                           </p>
                        </div>
                        {!isEditMode && (
                           <div style={{ position: 'relative' }}>
                              <label className={styles.label}>{t('new_password')}</label>
                              <input
                                 type={showPassword ? "text" : "password"}
                                 required
                                 className={styles.input}
                                 placeholder="********"
                                 value={formData.password}
                                 onChange={e => setFormData({ ...formData, password: e.target.value })}
                                 style={{ paddingRight: '40px' }}
                              />
                              <button
                                 type="button"
                                 onClick={() => setShowPassword(!showPassword)}
                                 className="text-gray-500 dark:text-gray-400"
                                 style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '68%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                 }}
                              >
                                 {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                       <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                       <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                 ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                       <circle cx="12" cy="12" r="3" />
                                    </svg>
                                 )}
                              </button>
                           </div>
                        )}
                        <div>
                           <label className={styles.label}>{t('phone_number')}</label>
                           <input
                              type="text" className={styles.input} placeholder="+1..."
                              value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                           />
                        </div>
                        <div>
                           <label className={styles.label}>{t('position')}</label>
                           <input
                              type="text" className={styles.input} placeholder="e.g. Senior Backend"
                              value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}
                           />
                        </div>
                        <div>
                           <label className={styles.label}>{t('role')}</label>
                           <select
                              className={styles.input}
                              value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                           >
                              <option value="company_admin">{t('company_admin')}</option>
                              <option value="team_lead">{t('team_lead')}</option>
                              {currentUser?.data?.user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                              <option value="frontend">{t('frontend')}</option>
                              <option value="backend">{t('backend')}</option>
                              <option value="designer">{t('designer')}</option>
                              <option value="marketer">{t('marketing')}</option>
                              <option value="employee">{t('employee_role')}</option>
                           </select>
                        </div>
                        {(currentUser?.data?.user.role === 'super_admin' || currentUser?.role === 'super_admin') && (
                           <div>
                              <label className={styles.label}>{t('company')}</label>
                              <select
                                 className={styles.input} required
                                 value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                              >
                                 <option value="">{t('select_company_placeholder')}</option>
                                 {(companies?.data?.companies || companies || []).map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                 ))}
                              </select>
                           </div>
                        )}
                     </div>
                     <div className="pt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeModal} className={styles.btnSecondary}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} className={styles.btnPrimary}>
                           {isSubmitting ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                           {isEditMode ? t('update_member') : t('create_member')}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Team Modal */}
         {isTeamModalOpen && (
            <div className={styles.modalOverlay}>
               <div className={styles.modalContent}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('create_new_team')}</h2>
                     <button onClick={closeModal} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition text-2xl">&times;</button>
                  </div>
                  <form onSubmit={handleTeamSubmit} className="p-6 space-y-4">
                     <div>
                        <label className={styles.label}>{t('team_name')}</label>
                        <input
                           type="text" required className={styles.input} placeholder="e.g. Backend Devs"
                           value={teamFormData.name} onChange={e => setTeamFormData({ ...teamFormData, name: e.target.value })}
                        />
                     </div>
                     <div>
                        <label className={styles.label}>{t('team_lead')}</label>
                        <select
                           required className={styles.input}
                           value={teamFormData.teamLeadId} onChange={e => setTeamFormData({ ...teamFormData, teamLeadId: e.target.value })}
                        >
                           {isLoading ? (
                              <option disabled>{t('loading_members')}</option>
                           ) : (
                              <>
                                 <option value="">{t('select_a_lead')}</option>
                                 {rawUserList
                                    .filter(u => {
                                       const uCompId = String(u.company?._id || u.company || '');
                                       const selectedId = String(teamFormData.companyId || '');
                                       const isLead = u.role === 'team_lead';
                                       // Super admin already filtered out in rawUserList memo
                                       return isLead && (!selectedId || uCompId === selectedId);
                                    })
                                    .map(u => (
                                       <option key={u._id} value={u._id}>{u.name} ({u.role?.replace('_', ' ')})</option>
                                    ))
                                 }
                                 {rawUserList.length === 0 && <option disabled>{t('no_users_found')}</option>}
                              </>
                           )}
                        </select>
                     </div>
                     <div>
                        <label className={styles.label}>{t('description_label')}</label>
                        <textarea
                           className={styles.input + " h-24 resize-none"}
                           placeholder="Team responsibilities..."
                           value={teamFormData.description} onChange={e => setTeamFormData({ ...teamFormData, description: e.target.value })}
                        ></textarea>
                     </div>
                     {isSuperAdmin && (
                        <div>
                           <label className={styles.label}>{t('company')}</label>
                           <select
                              className={styles.input} required
                              value={teamFormData.companyId} onChange={e => setTeamFormData({ ...teamFormData, companyId: e.target.value })}
                           >
                              <option value="">{t('select_company_placeholder')}</option>
                              {(companies?.data?.companies || companies || []).map(c => (
                                 <option key={c._id} value={c._id}>{c.name}</option>
                              ))}
                           </select>
                        </div>
                     )}
                     <div className="pt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeModal} className={styles.btnSecondary}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} className={styles.btnPrimary}>
                           {isSubmitting ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                           {t('create_team')}
                        </button>
                     </div>
                  </form>
               </div>
            </div >
         )}

         {/* Add Member to Team Modal */}
         {
            isMemberModalOpen && (
               <div className={styles.modalOverlay}>
                  <div className={styles.modalContent + " max-w-md"}>
                     <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('add_member_to_team')}</h2>
                        <button onClick={closeModal} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition text-2xl">&times;</button>
                     </div>
                     <div className="p-6 space-y-4">
                        <div>
                           <label className={styles.label}>{t('select_member')}</label>
                           <select
                              className={styles.input}
                              value={memberToAddId} onChange={e => setMemberToAddId(e.target.value)}
                           >
                              {isLoading ? (
                                 <option disabled>{t('loading_members')}</option>
                              ) : (
                                 <>
                                    <option value="">{t('choose_user')}</option>
                                    {rawUserList
                                       .filter(u => {
                                          const uCompId = String(u.company?._id || u.company || '');
                                          const selectedId = String(selectedTeamCompanyId || '');
                                          return uCompId === selectedId;
                                       })
                                       .map(u => (
                                          <option key={u._id} value={u._id}>{u.name} ({u.role?.replace('_', ' ')})</option>
                                       ))
                                    }
                                    {rawUserList.length === 0 && <option disabled>{t('no_users_found')}</option>}
                                 </>
                              )}
                           </select>
                        </div>
                        <div className="pt-4 flex justify-end space-x-3">
                           <button onClick={closeModal} className={styles.btnSecondary}>{t('cancel')}</button>
                           <button
                              onClick={handleConfirmAddMember}
                              disabled={isSubmitting || !memberToAddId}
                              className={styles.btnPrimary}
                           >
                              {isSubmitting ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                              {t('add_to_team')}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )
         }

         {/* Move Team Modal */}
         {isMoveModalOpen && (
            <div className={styles.modalOverlay}>
               <div className={styles.modalContent + " max-w-md"}>
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('move_user_to_team')}</h2>
                     <button onClick={() => setIsMoveModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition text-2xl">&times;</button>
                  </div>
                  <div className="p-6 space-y-4">
                     <div>
                        <label className={styles.label}>{t('select_target_team')}</label>
                        <select
                           className={styles.input}
                           value={newTeamId} onChange={e => setNewTeamId(e.target.value)}
                        >
                           <option value="">{t('choose_team')}</option>
                           {allTeams.map(t => (
                              <option key={t._id} value={t._id}>{t.name} ({t.companyName})</option>
                           ))}
                        </select>
                     </div>
                     <div className="pt-4 flex justify-end space-x-3">
                        <button onClick={() => setIsMoveModalOpen(false)} className={styles.btnSecondary}>{t('cancel')}</button>
                        <button
                           onClick={handleConfirmMoveTeam}
                           disabled={isSubmitting || !newTeamId}
                           className={styles.btnPrimary}
                        >
                           {isSubmitting ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                           {t('confirm_move')}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Profiles;
