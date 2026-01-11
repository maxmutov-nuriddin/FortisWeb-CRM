/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useCompanyStore } from '../store/company.store';
import { useProjectStore } from '../store/project.store';
import { useAuthStore } from '../store/auth.store';
import PageLoader from '../components/loader/PageLoader';
import { useUserStore } from '../store/user.store';
import { useSettingsStore } from '../store/settings.store';
import { useProjectUploadStore } from '../store/project-upload.store';
import { useTaskStore } from '../store/task.store';
import { usePaymentStore } from '../store/payment.store';
import Cookies from 'js-cookie';

const Orders = () => {
   const { t } = useTranslation();
   const { theme } = useSettingsStore();
   const [statusFilter, setStatusFilter] = useState('All Statuses');
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedOrder, setSelectedOrder] = useState(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isEditMode, setIsEditMode] = useState(false);
   const [isCreateMode, setIsCreateMode] = useState(false);
   const [isViewMode, setIsViewMode] = useState(false);
   const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isAddingRepo, setIsAddingRepo] = useState(false);
   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
   const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bank_transfer');
   const [uploadedFile, setUploadedFile] = useState(null);
   const [selectedTeams, setSelectedTeams] = useState([]);

   const [formData, setFormData] = useState({
      title: '',
      description: '',
      budget: '',
      status: 'pending',
      deadline: '',
      priority: 'medium',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientCompany: '',
      selectedCompanyId: '',
      assignedTeamId: '',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending'
   });

   const [repoData, setRepoData] = useState({
      provider: 'github',
      url: '',
      accessToken: ''
   });

   const { user } = useAuthStore();
   const userData = user?.data?.user || user?.user || user;
   const isSuperAdmin = userData?.role === 'super_admin';
   const isCompanyAdmin = userData?.role === 'company_admin';
   const isTeamLead = userData?.role === 'team_lead';
   const isAdmin = isSuperAdmin || isCompanyAdmin;

   const { companies, getCompanies, getCompanyById, selectedCompany } = useCompanyStore();
   const { projects, getProjectsByCompany, getAllProjects, createProject, updateProject, deleteProject, addRepository, assignProject, isLoading: projectsLoading } = useProjectStore();
   const { getUsersByCompany, getAllUsers, isLoading: usersLoading } = useUserStore();
   const { tasks, getTasksByUser } = useTaskStore();
   const { uploadFile, getFiles, uploads } = useProjectUploadStore();
   const { createPayment, deletePayment, getPaymentsByCompany, payments } = usePaymentStore();

   const [viewCompanyId, setViewCompanyId] = useState('all');

   const activeCompanyId = useMemo(() => {
      if (isSuperAdmin) return viewCompanyId;
      return userData?.company?._id || userData?.company || '';
   }, [isSuperAdmin, viewCompanyId, userData]);

   const allCompanies = useMemo(() => {
      const list = companies?.data?.companies || companies?.companies || [];
      const selected = selectedCompany?.data || selectedCompany;
      if (selected && selected._id && !list.find(c => String(c._id) === String(selected._id))) {
         return [...list, selected];
      }
      return list;
   }, [companies, selectedCompany]);

   useEffect(() => {
      const initData = async () => {
         if (isSuperAdmin && viewCompanyId === 'all') {
            const res = await getCompanies();
            const list = res?.data?.companies || res || [];
            const ids = list.map(c => c._id);
            if (ids.length) {
               getAllProjects(ids);
               getAllUsers(ids);
            }
         } else if (activeCompanyId && activeCompanyId !== 'all') {
            getCompanyById(activeCompanyId);
            getProjectsByCompany(activeCompanyId);
            getUsersByCompany(activeCompanyId);
         }
      };
      initData();
   }, [isSuperAdmin, viewCompanyId, activeCompanyId]);

   // Load teams when company is selected
   useEffect(() => {
      if (formData.selectedCompanyId) {
         const company = allCompanies.find(c => c._id === formData.selectedCompanyId);
         if (company) {
            setSelectedTeams(company.teams || []);
         } else {
            getCompanyById(formData.selectedCompanyId).then(companyData => {
               setSelectedTeams(companyData?.teams || []);
            });
         }
      } else if (!isSuperAdmin && activeCompanyId) {
         const company = allCompanies.find(c => c._id === activeCompanyId);
         if (company) {
            setSelectedTeams(company.teams || []);
         } else if (selectedCompany) {
            setSelectedTeams(selectedCompany.teams || []);
         }
      }
   }, [formData.selectedCompanyId, allCompanies, selectedCompany, activeCompanyId, isSuperAdmin]);

   const projectsList = useMemo(() => {
      const allProjects = projects?.data?.projects || (Array.isArray(projects) ? projects : []);

      // Debug logging
      if (userData?.role === 'team_lead' && allProjects.length > 0) {
         console.log('=== TEAM LEAD DEBUG ===');
         console.log('Current User ID:', userData._id);
         console.log('Total Projects:', allProjects.length);
         allProjects.forEach((p, idx) => {
            console.log(`Project ${idx + 1}:`, {
               title: p.title,
               teamLead: p.teamLead,
               assignedTeam: p.assignedTeam,
               assignedTeamId: p.assignedTeamId
            });
         });
      }

      if (userData?.role === 'team_lead') {
         const currentUserId = String(userData._id);

         // Get all teams from all companies to match assignedTeamId
         const allTeams = [];
         allCompanies.forEach(company => {
            if (company.teams && Array.isArray(company.teams)) {
               allTeams.push(...company.teams);
            }
         });

         const filtered = allProjects.filter(p => {
            // Check direct teamLead field
            const projectTeamLeadId = String(p.teamLead?._id || p.teamLead || '');
            if (projectTeamLeadId === currentUserId) return true;

            // Check assignedTeam.teamLead (if populated)
            const assignedTeamLeadId = String(p.assignedTeam?.teamLead?._id || p.assignedTeam?.teamLead || '');
            if (assignedTeamLeadId === currentUserId) return true;

            // Check assignedTeamId by looking up in company teams
            const assignedTeamId = String(p.assignedTeam?._id || p.assignedTeam || p.assignedTeamId || '');
            if (assignedTeamId) {
               const team = allTeams.find(t => String(t._id || t.id) === assignedTeamId);
               if (team) {
                  const teamLeadId = String(team.teamLead?._id || team.teamLead || '');
                  if (teamLeadId === currentUserId) {
                     console.log('✓ Project matches via assignedTeamId lookup:', p.title, 'Team:', team.name);
                     return true;
                  }
               }
            }

            return false;
         });

         console.log('Filtered projects for team lead:', filtered.length);
         return filtered;
      }
      if (userData?.role === 'worker') {
         const userTasks = Array.isArray(tasks) ? tasks : tasks?.data?.tasks || [];
         const myProjectIds = new Set(userTasks.map(t => String(t.project?._id || t.project || '')));
         return allProjects.filter(p => myProjectIds.has(String(p._id)));
      }
      return allProjects;
   }, [projects, userData, tasks, allCompanies]);

   const filteredOrders = useMemo(() => {
      let result = [...projectsList];

      if (statusFilter !== 'All Statuses') {
         result = result.filter(p => {
            if (statusFilter === 'Pending') return p.status === 'pending';
            if (statusFilter === 'In Progress') return ['in_progress', 'assigned', 'review', 'revision'].includes(p.status);
            if (statusFilter === 'Completed') return p.status === 'completed';
            if (statusFilter === 'Cancelled') return p.status === 'cancelled';
            return true;
         });
      }

      if (searchQuery) {
         const q = searchQuery.toLowerCase();
         result = result.filter(p =>
            p.title?.toLowerCase().includes(q) ||
            p.client?.name?.toLowerCase().includes(q) ||
            p._id.toLowerCase().includes(q)
         );
      }

      return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
   }, [projectsList, statusFilter, searchQuery]);

   const getStatusBadge = (status) => {
      switch (status) {
         case 'pending': return 'bg-yellow-50 text-yellow-600 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30';
         case 'assigned':
         case 'in_progress':
         case 'review':
         case 'revision': return 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
         case 'completed': return 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30';
         case 'cancelled': return 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
         default: return 'bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      }
   };

   const handleDelete = async (e, id) => {
      e.stopPropagation();
      if (!isAdmin) {
         toast.error('Only admins can delete orders');
         return;
      }
      if (window.confirm('Delete this order? This action cannot be undone.')) {
         try {
            await deleteProject(id);
            toast.success('Order deleted successfully');
            setIsModalOpen(false);
            setSelectedOrder(null);
         } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete order');
         }
      }
   };

   const handleView = (e, order) => {
      e.stopPropagation();
      setSelectedOrder(order);
      setIsViewMode(true);
      setIsEditMode(false);
      setIsCreateMode(false);
      setIsModalOpen(true);

      // Load files for this order with error handling
      try {
         const companyId = order.company?._id || order.company || activeCompanyId;
         getFiles({ orderId: order._id, companyId }).catch(err => {
            console.error('Failed to load files:', err);
            // Don't show error toast - just log it, files section will be hidden if no files
         });
      } catch (err) {
         console.error('Error loading files:', err);
      }
   };

   const handleEdit = (e, order) => {
      e.stopPropagation();
      if (!isAdmin) {
         toast.error('Only admins can edit orders');
         return;
      }
      setSelectedOrder(order);
      setFormData({
         title: order.title || '',
         budget: order.budget || '',
         description: order.description || '',
         status: order.status || 'pending',
         deadline: order.deadline ? new Date(order.deadline).toISOString().split('T')[0] : '',
         priority: order.priority || 'medium',
         clientName: order.client?.name || '',
         clientEmail: order.client?.email || '',
         clientPhone: order.client?.phone || '',
         clientCompany: order.client?.company || '',
         selectedCompanyId: order.company?._id || order.company || '',
         assignedTeamId: order.assignedTeam?._id || order.assignedTeam || ''
      });
      setIsEditMode(true);
      setIsCreateMode(false);
      setIsViewMode(false);
      setIsModalOpen(true);
   };

   const handleCreate = () => {
      setIsCreateMode(true);
      setIsEditMode(false);
      setIsViewMode(false);
      setSelectedOrder(null);
      setUploadedFile(null);
      setFormData({
         title: '',
         description: '',
         budget: '',
         status: 'pending',
         deadline: '',
         priority: 'medium',
         clientName: '',
         clientEmail: '',
         clientPhone: '',
         clientCompany: '',
         selectedCompanyId: isSuperAdmin ? '' : activeCompanyId,
         assignedTeamId: ''
      });
      setIsModalOpen(true);
   };

   const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
         const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/zip', 'application/x-zip-compressed'];
         const allowedExtensions = ['.pdf', '.docx', '.doc', '.zip'];
         const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

         if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            toast.error('Only PDF, DOCX, and ZIP files are allowed');
            e.target.value = '';
            return;
         }

         setUploadedFile(file);
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
         // Validation
         if (!formData.title.trim()) {
            toast.error('Title is required');
            setIsSubmitting(false);
            return;
         }

         if (isSuperAdmin && !formData.selectedCompanyId) {
            toast.error('Please select a company');
            setIsSubmitting(false);
            return;
         }

         if (!formData.assignedTeamId) {
            toast.error('Please select a team');
            setIsSubmitting(false);
            return;
         }

         if (formData.budget && parseFloat(formData.budget) <= 0) {
            toast.error('Budget must be a positive number');
            setIsSubmitting(false);
            return;
         }

         const projectData = {
            title: formData.title,
            description: formData.description,
            budget: parseFloat(formData.budget) || 0,
            deadline: formData.deadline || undefined,
            priority: formData.priority,
            status: isEditMode ? formData.status : 'pending', // Always pending for new orders
            companyId: isSuperAdmin ? formData.selectedCompanyId : activeCompanyId,
            assignedTeamId: formData.assignedTeamId,
            client: {
               name: formData.clientName,
               email: formData.clientEmail,
               phone: formData.clientPhone,
               company: formData.clientCompany
            },
            paymentStatus: 'pending'
         };

         let result;
         let projectId;

         if (isEditMode && selectedOrder) {
            result = await updateProject(selectedOrder._id, projectData);
            projectId = selectedOrder._id;

            // Assign team after update
            if (formData.assignedTeamId) {
               try {
                  await assignProject(projectId, { assignedTeamId: formData.assignedTeamId });
               } catch (assignErr) {
                  console.error('Failed to assign team:', assignErr);
                  toast.warning('Order updated but team assignment failed');
               }
            }

            toast.success('Order updated successfully');
         } else {
            // Create project first
            result = await createProject(projectData);
            projectId = result?.data?.project?._id || result?.data?._id || result?._id;

            // Assign team after creation
            if (projectId && formData.assignedTeamId) {
               try {
                  const assignResult = await assignProject(projectId, { assignedTeamId: formData.assignedTeamId });
                  console.log('Team assigned successfully:', assignResult);

                  // Ensure status remains 'pending' after team assignment
                  // Backend might auto-change to 'in_progress', so we explicitly set it back
                  await updateProject(projectId, { status: 'pending' });
               } catch (assignErr) {
                  console.error('Failed to assign team:', assignErr);
                  toast.warning('Order created but team assignment failed');
               }
            }

            toast.success('Order created successfully');
         }


         // Upload file if present
         if (uploadedFile && projectId) {
            const fileFormData = new FormData();
            fileFormData.append('file', uploadedFile);
            fileFormData.append('orderId', projectId);
            if (isSuperAdmin && formData.selectedCompanyId) {
               fileFormData.append('companyId', formData.selectedCompanyId);
            } else if (activeCompanyId) {
               fileFormData.append('companyId', activeCompanyId);
            }

            try {
               await uploadFile(fileFormData);
               toast.success('Technical specification uploaded');
            } catch (uploadErr) {
               console.error('File upload error:', uploadErr);
               toast.warning('Order created but file upload failed');
            }
         }

         // Create initial pending payment
         if (projectId) {
            try {
               await createPayment({
                  projectId: projectId,
                  totalAmount: parseFloat(formData.budget) || 0,
                  paymentMethod: formData.paymentMethod || 'bank_transfer'
               });
            } catch (payErr) {
               console.error('Failed to create initial payment:', payErr);
               toast.warning('Order created but failed to initialize payment status');
            }
         }


         setIsModalOpen(false);
         setIsSubmitting(false);
         setUploadedFile(null);
         setFormData({
            title: '',
            description: '',
            budget: '',
            status: 'pending',
            deadline: '',
            priority: 'medium',
            clientName: '',
            clientEmail: '',
            clientPhone: '',
            clientCompany: '',
            selectedCompanyId: '',
            assignedTeamId: '',
            paymentMethod: 'bank_transfer',
            paymentStatus: 'pending'
         });
      } catch (err) {
         console.error('Submit error:', err);
         toast.error(err.response?.data?.message || 'Failed to save order');
         setIsSubmitting(false);
      }
   };

   const handleStatusChange = async (newStatus) => {
      if (!selectedOrder) return;

      try {
         await updateProject(selectedOrder._id, { status: newStatus });
         toast.success('Status updated successfully');
         setSelectedOrder({ ...selectedOrder, status: newStatus });
      } catch (err) {
         toast.error(err.response?.data?.message || 'Failed to update status');
      }
   };

   const handleAddRepository = async (e) => {
      e.preventDefault();
      console.log('handleAddRepository called!', { selectedOrder, repoData });

      if (!selectedOrder) {
         console.log('No selected order!');
         return;
      }

      if (!repoData.url.trim()) {
         toast.error('Repository URL is required');
         return;
      }

      setIsAddingRepo(true);
      console.log('Adding repository:', { orderId: selectedOrder._id, ...repoData });

      try {
         const response = await addRepository(selectedOrder._id, {
            url: repoData.url,
            accessToken: repoData.accessToken,
            provider: repoData.provider
         });
         console.log('Repository added response:', response);
         toast.success('Repository added successfully');
         setIsRepoModalOpen(false);
         setRepoData({ provider: 'github', url: '', accessToken: '' });

         // Refresh order data by fetching updated project
         if (isSuperAdmin && viewCompanyId === 'all') {
            const res = await getCompanies();
            const list = res?.data?.companies || res || [];
            const ids = list.map(c => c._id);
            if (ids.length) {
               await getAllProjects(ids);
            }
         } else if (activeCompanyId && activeCompanyId !== 'all') {
            await getProjectsByCompany(activeCompanyId);
         }

         // Update selected order with new repository data
         const updatedProject = response?.data?.project || response?.data?.data?.project || response?.data;
         console.log('Updated project:', updatedProject);
         if (updatedProject && updatedProject.repository) {
            setSelectedOrder(updatedProject);
         } else {
            // If response doesn't include full project, fetch it
            const projects = await getProjectsByCompany(activeCompanyId);
            const refreshedProject = projects?.data?.projects?.find(p => p._id === selectedOrder._id);
            if (refreshedProject) {
               setSelectedOrder(refreshedProject);
            }
         }
      } catch (err) {
         console.error('Repository error:', err);
         toast.error(err.response?.data?.message || 'Failed to add repository');
      } finally {
         setIsAddingRepo(false);
      }
   };

   const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
   };

   const handleConfirmPayment = async () => {
      if (!selectedOrder) return;
      setIsSubmitting(true);

      try {
         // Check for existing payments for this order and delete them (to replace with new method)
         const allPayments = payments?.data?.payments || (Array.isArray(payments) ? payments : []);
         const existingPayments = allPayments.filter(p =>
            String(p.project?._id || p.project || '') === String(selectedOrder._id)
         );

         if (existingPayments.length > 0) {
            await Promise.all(existingPayments.map(p => deletePayment(p._id)));
         }

         // Create new payment with selected method
         const payment = await createPayment({
            projectId: selectedOrder._id,
            totalAmount: selectedOrder.budget || 0,
            paymentMethod: selectedPaymentMethod
         });

         const paymentId = payment._id || payment.id;

         // Confirm payment
         const confirmResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/${paymentId}/confirm`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${Cookies.get('token')}` }
         });

         if (!confirmResponse.ok) {
            throw new Error('Failed to confirm payment');
         }

         // Update order status
         await updateProject(selectedOrder._id, { status: 'in_progress' });
         toast.success(`Payment confirmed! Order started.`);
         setSelectedOrder({ ...selectedOrder, status: 'in_progress' });
         setIsPaymentModalOpen(false);
         setIsModalOpen(false);
      } catch (error) {
         console.error('Payment error:', error);
         toast.error(error.message || 'Failed to confirm payment');
      } finally {
         setIsSubmitting(false);
      }
   };

   const downloadFile = async (fileId, filename) => {
      try {
         const token = Cookies.get('token');
         const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/uploads/${fileId}/download`, {
            method: 'GET',
            headers: {
               'Authorization': `Bearer ${token}`
            }
         });

         if (!response.ok) {
            throw new Error('Download failed');
         }

         const blob = await response.blob();
         const url = window.URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = filename || 'download';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         window.URL.revokeObjectURL(url);
         toast.success('Download started');
      } catch (error) {
         console.error('Download error:', error);
         toast.error('Failed to download file');
      }
   };

   if ((projectsLoading || usersLoading) && projectsList.length === 0) return <PageLoader />;

   return (
      <div className="min-h-screen p-6 lg:p-10 bg-gray-50/50 dark:bg-black text-gray-900 dark:text-white font-sans">
         <div className="max-w-[1600px] mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t('orders_management')}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Track and manage client orders</p>
               </div>

               <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <div className="relative group flex-1 sm:flex-none">
                     <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-red-500 transition-colors"></i>
                     <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm transition-all"
                     />
                  </div>

                  <select
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                     className="px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer shadow-sm"
                  >
                     <option>All Statuses</option>
                     <option>Pending</option>
                     <option>In Progress</option>
                     <option>Completed</option>
                     <option>Cancelled</option>
                  </select>

                  {isAdmin && (
                     <button
                        onClick={handleCreate}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                     >
                        <i className="fa-solid fa-plus"></i>
                        New Order
                     </button>
                  )}
               </div>
            </div>

            {/* Orders Table Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap">
                     <thead>
                        <tr className="bg-gray-50/50 dark:bg-zinc-800/50 text-left border-b border-gray-100 dark:border-zinc-800">
                           <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">ID</th>
                           <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">Client</th>
                           <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">Project Title</th>
                           <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">Budget</th>
                           <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">Deadline</th>
                           <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-wider">Status</th>
                           <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {filteredOrders.length > 0 ? (
                           filteredOrders.map((order) => (
                              <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer" onClick={(e) => handleView(e, order)}>
                                 <td className="px-8 py-5 text-sm font-mono text-gray-500">#{order._id.slice(-6).toUpperCase()}</td>
                                 <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                          {order.client?.name?.[0] || 'C'}
                                       </div>
                                       <div>
                                          <div className="text-sm font-bold text-gray-900 dark:text-white">{order.client?.name || 'Unknown Client'}</div>
                                          <div className="text-xs text-gray-500">{order.client?.email || 'No email'}</div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                       <div className="text-sm font-semibold text-gray-900 dark:text-white max-w-[200px] truncate">{order.title}</div>
                                       {order.repository && (
                                          <i className="fa-brands fa-git-alt text-gray-400 text-xs" title="Repository connected"></i>
                                       )}
                                    </div>
                                 </td>
                                 <td className="px-8 py-5 text-sm font-bold text-gray-900 dark:text-white font-mono">${order.budget?.toLocaleString()}</td>
                                 <td className="px-8 py-5 text-sm font-medium text-gray-500">
                                    {order.deadline ? new Date(order.deadline).toLocaleDateString() : '—'}
                                 </td>
                                 <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(order.status)}`}>
                                       {order.status.replace('_', ' ')}
                                    </span>
                                 </td>
                                 <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                       <button
                                          onClick={(e) => handleView(e, order)}
                                          className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                          title="View"
                                       >
                                          <i className="fa-solid fa-eye text-xs"></i>
                                       </button>
                                       {isAdmin && (
                                          <button
                                             onClick={(e) => handleEdit(e, order)}
                                             className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                             title="Edit"
                                          >
                                             <i className="fa-solid fa-pen text-xs"></i>
                                          </button>
                                       )}
                                       {isAdmin && (
                                          <button
                                             onClick={(e) => handleDelete(e, order._id)}
                                             className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                             title="Delete"
                                          >
                                             <i className="fa-solid fa-trash text-xs"></i>
                                          </button>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan="7" className="px-8 py-16 text-center">
                                 <div className="flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                       <i className="fa-solid fa-inbox text-2xl text-gray-400"></i>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Orders Found</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Try adjusting your filters or create a new order.</p>
                                 </div>
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* View Modal */}
         {isModalOpen && isViewMode && selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)}></div>
               <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-4xl p-8 relative z-10 shadow-2xl border border-gray-100 dark:border-zinc-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white">Order Details</h2>
                     <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition">
                        <i className="fa-solid fa-times"></i>
                     </button>
                  </div>

                  <div className="space-y-6">
                     {/* Order Information */}
                     <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                           <i className="fa-solid fa-info-circle text-red-500"></i>
                           Order Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Order ID</p>
                              <p className="text-sm font-mono text-gray-900 dark:text-white">#{selectedOrder._id.slice(-8).toUpperCase()}</p>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Status</p>
                              <div className="flex items-center gap-2">
                                 <select
                                    value={selectedOrder.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    disabled={!isAdmin}
                                    className="px-3 py-1 rounded-lg text-sm font-bold bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="review">Review</option>
                                    <option value="revision">Revision</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                 </select>
                                 {/* Payment Confirmation Button - Only for admins when status is pending */}
                                 {isAdmin && selectedOrder.status === 'pending' && (
                                    <button
                                       onClick={() => setIsPaymentModalOpen(true)}
                                       className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                       title="Confirm payment and start order"
                                    >
                                       <i className="fa-solid fa-check-circle"></i>
                                       Confirm Payment
                                    </button>
                                 )}
                              </div>
                           </div>
                           <div className="col-span-2">
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Title</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedOrder.title}</p>
                           </div>
                           <div className="col-span-2">
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Description</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{selectedOrder.description || 'No description'}</p>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Budget</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">${selectedOrder.budget?.toLocaleString()}</p>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Priority</p>
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${selectedOrder.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                 selectedOrder.priority === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                    'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                 }`}>
                                 {selectedOrder.priority}
                              </span>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Deadline</p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                 {selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleDateString() : 'No deadline'}
                              </p>
                           </div>
                        </div>
                     </div>

                     {/* Client Information */}
                     <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                           <i className="fa-solid fa-user text-red-500"></i>
                           Client Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Name</p>
                              <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.client?.name || 'N/A'}</p>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Email</p>
                              <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.client?.email || 'N/A'}</p>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Phone</p>
                              <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.client?.phone || 'N/A'}</p>
                           </div>
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Company</p>
                              <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.client?.company || 'N/A'}</p>
                           </div>
                        </div>
                     </div>

                     {/* Technical Specification - Only visible to Admins and Team Leads */}
                     {(isAdmin || isTeamLead) && (
                        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6">
                           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <i className="fa-solid fa-file-alt text-red-500"></i>
                              Technical Specification (ТЗ)
                              {isTeamLead && (
                                 <span className="ml-auto text-xs font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                    <i className="fa-solid fa-check-circle mr-1"></i>
                                    Available for download
                                 </span>
                              )}
                           </h3>
                           {uploads && uploads.length > 0 ? (
                              <div className="space-y-2">
                                 {uploads.map((file) => (
                                    <div key={file._id} className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-700">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                                             <i className="fa-solid fa-file-pdf text-red-500"></i>
                                          </div>
                                          <div>
                                             <p className="text-sm font-bold text-gray-900 dark:text-white">{file.filename || 'Document'}</p>
                                             <p className="text-xs text-gray-500">{file.size ? `${(file.size / 1024).toFixed(2)} KB` : ''}</p>
                                          </div>
                                       </div>
                                       <button
                                          onClick={() => downloadFile(file._id, file.filename)}
                                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition"
                                       >
                                          <i className="fa-solid fa-download mr-2"></i>
                                          Download
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <div className="text-center py-4">
                                 <i className="fa-solid fa-file-circle-exclamation text-3xl text-gray-400 mb-2"></i>
                                 <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {isAdmin ? 'No technical specification uploaded yet' : 'Technical specification not available'}
                                 </p>
                                 {isAdmin && (
                                    <p className="text-xs text-gray-400 mt-1">Upload files when creating or editing the order</p>
                                 )}
                              </div>
                           )}
                        </div>
                     )}

                     {/* Repository Information */}
                     <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                           <i className="fa-brands fa-git-alt text-red-500"></i>
                           Repository
                        </h3>


                        {(selectedOrder.repository?.url || selectedOrder.repositoryUrl) ? (
                           <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                 <span className="px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-bold">
                                    {selectedOrder.repository.provider || 'Git'}
                                 </span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <input
                                    type="text"
                                    value={selectedOrder.repository.url || selectedOrder.repositoryUrl || ''}
                                    readOnly
                                    className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-mono"
                                 />
                                 <button
                                    onClick={() => copyToClipboard(selectedOrder.repository.url || selectedOrder.repositoryUrl)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded-lg text-sm font-bold transition"
                                 >
                                    <i className="fa-solid fa-copy"></i>
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="text-center">
                              <i className="fa-brands fa-git-alt text-4xl text-gray-400 mb-3"></i>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No repository connected</p>
                              {(isAdmin || isTeamLead) ? (
                                 <button
                                    onClick={() => {
                                       console.log('Add Repository clicked! User role:', userData?.role, 'isAdmin:', isAdmin, 'isTeamLead:', isTeamLead);
                                       setIsRepoModalOpen(true);
                                    }}
                                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition"
                                 >
                                    <i className="fa-solid fa-plus mr-2"></i>
                                    Add Repository
                                 </button>
                              ) : (
                                 <p className="text-xs text-gray-400">Only admins and team leads can add repositories</p>
                              )}
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                     <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition">
                        Close
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Create/Edit Modal */}
         {isModalOpen && (isCreateMode || isEditMode) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)}></div>
               <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-3xl p-8 relative z-10 shadow-2xl border border-gray-100 dark:border-zinc-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white">{isCreateMode ? 'Create New Order' : 'Edit Order'}</h2>
                     <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition">
                        <i className="fa-solid fa-times"></i>
                     </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                     {/* Company Selection (Super Admin Only) */}
                     {isSuperAdmin && (
                        <div>
                           <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Company <span className="text-red-500">*</span>
                           </label>
                           <select
                              value={formData.selectedCompanyId}
                              onChange={(e) => setFormData({ ...formData, selectedCompanyId: e.target.value, assignedTeamId: '' })}
                              required
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                           >
                              <option value="">Select Company</option>
                              {allCompanies.map(company => (
                                 <option key={company._id} value={company._id}>{company.name}</option>
                              ))}
                           </select>
                        </div>
                     )}

                     {/* Team Selection */}
                     <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                           Team <span className="text-red-500">*</span>
                        </label>
                        <select
                           value={formData.assignedTeamId}
                           onChange={(e) => setFormData({ ...formData, assignedTeamId: e.target.value })}
                           required
                           className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                        >
                           <option value="">Select Team</option>
                           {selectedTeams.map(team => (
                              <option key={team._id} value={team._id}>{team.name}</option>
                           ))}
                        </select>
                     </div>

                     {/* Project Details */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Project Title <span className="text-red-500">*</span>
                           </label>
                           <input
                              type="text"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              required
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                              placeholder="Enter project title"
                           />
                        </div>

                        <div className="col-span-2">
                           <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                           <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              rows="3"
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium resize-none"
                              placeholder="Project description"
                           ></textarea>
                        </div>

                        <div>
                           <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Budget</label>
                           <input
                              type="number"
                              value={formData.budget}
                              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                              min="0"
                              step="0.01"
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                              placeholder="0.00"
                           />
                        </div>

                        <div>
                           <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Deadline</label>
                           <input
                              type="date"
                              value={formData.deadline}
                              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                           />
                        </div>

                        <div>
                           <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                           <select
                              value={formData.priority}
                              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                           >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                           </select>
                        </div>
                     </div>

                     {/* Client Information */}
                     <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Client Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Client Name</label>
                              <input
                                 type="text"
                                 value={formData.clientName}
                                 onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                 className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                                 placeholder="Client name"
                              />
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Client Email</label>
                              <input
                                 type="email"
                                 value={formData.clientEmail}
                                 onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                                 onBlur={(e) => {
                                    const email = e.target.value;
                                    if (email && !email.includes('@')) {
                                       const completedEmail = email.trim() + '@gmail.com';
                                       setFormData({ ...formData, clientEmail: completedEmail });
                                    }
                                 }}
                                 className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                                 placeholder="client@example.com"
                              />
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Client Phone</label>
                              <input
                                 type="tel"
                                 value={formData.clientPhone}
                                 onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                 className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                                 placeholder="+1 234 567 8900"
                              />
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Client Company</label>
                              <input
                                 type="text"
                                 value={formData.clientCompany}
                                 onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                                 className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-medium"
                                 placeholder="Company name"
                              />
                           </div>
                        </div>
                     </div>

                     {/* Technical Specification Upload */}
                     <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                           Technical Specification (Optional)
                        </label>
                        <div className="flex items-center gap-4">
                           <label className="flex-1 cursor-pointer">
                              <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-6 text-center hover:border-red-500 transition">
                                 <i className="fa-solid fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                                 <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {uploadedFile ? uploadedFile.name : 'Click to upload PDF, DOCX, or ZIP'}
                                 </p>
                                 <p className="text-xs text-gray-500 mt-1">Max file size: 10MB</p>
                              </div>
                              <input
                                 type="file"
                                 accept=".pdf,.docx,.doc,.zip"
                                 onChange={handleFileChange}
                                 className="hidden"
                              />
                           </label>
                        </div>
                     </div>

                     <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-zinc-700">
                        <button
                           type="button"
                           onClick={() => setIsModalOpen(false)}
                           className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={isSubmitting}
                           className="px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isSubmitting ? (
                              <>
                                 <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                 {isCreateMode ? 'Creating...' : 'Saving...'}
                              </>
                           ) : (
                              <>
                                 <i className={`fa-solid ${isCreateMode ? 'fa-plus' : 'fa-save'} mr-2`}></i>
                                 {isCreateMode ? 'Create Order' : 'Save Changes'}
                              </>
                           )}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Repository Modal */}
         {isRepoModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setIsRepoModalOpen(false)}></div>
               <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl p-8 relative z-10 shadow-2xl border border-gray-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white">Add Repository</h2>
                     <button onClick={() => setIsRepoModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition">
                        <i className="fa-solid fa-times"></i>
                     </button>
                  </div>

                  <form onSubmit={handleAddRepository} className="space-y-6">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                           Repository Provider
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                           <button
                              type="button"
                              onClick={() => setRepoData({ ...repoData, provider: 'github' })}
                              className={`p-4 rounded-xl border-2 transition ${repoData.provider === 'github'
                                 ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                 : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                                 }`}
                           >
                              <i className="fa-brands fa-github text-2xl mb-2"></i>
                              <p className="text-sm font-bold">GitHub</p>
                           </button>
                           <button
                              type="button"
                              onClick={() => setRepoData({ ...repoData, provider: 'gitlab' })}
                              className={`p-4 rounded-xl border-2 transition ${repoData.provider === 'gitlab'
                                 ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                 : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                                 }`}
                           >
                              <i className="fa-brands fa-gitlab text-2xl mb-2"></i>
                              <p className="text-sm font-bold">GitLab</p>
                           </button>
                           <button
                              type="button"
                              onClick={() => setRepoData({ ...repoData, provider: 'bitbucket' })}
                              className={`p-4 rounded-xl border-2 transition ${repoData.provider === 'bitbucket'
                                 ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                 : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                                 }`}
                           >
                              <i className="fa-brands fa-bitbucket text-2xl mb-2"></i>
                              <p className="text-sm font-bold">Bitbucket</p>
                           </button>
                        </div>

                        {/* Provider Instructions */}
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                           <div className="flex items-start gap-2">
                              <i className="fa-solid fa-info-circle text-blue-500 mt-1"></i>
                              <div className="text-xs text-gray-700 dark:text-gray-300">
                                 {repoData.provider === 'github' && (
                                    <>
                                       <p className="font-bold mb-2">GitHub Instructions:</p>
                                       <p className="mb-1"><strong>How to get Repository URL:</strong></p>
                                       <ol className="list-decimal ml-4 space-y-1 mb-3">
                                          <li>Go to your repository on GitHub.com</li>
                                          <li>Click the green <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Code</code> button</li>
                                          <li>Copy the HTTPS URL (e.g., https://github.com/username/repository)</li>
                                       </ol>
                                       <p className="mb-1"><strong>How to get Access Token:</strong></p>
                                       <ol className="list-decimal ml-4 space-y-1">
                                          <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                                          <li>Click "Generate new token (classic)"</li>
                                          <li>Select scopes: ☑️<code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">repo</code> (for private repos)</li>
                                          <li>Copy the generated token</li>
                                       </ol>
                                    </>
                                 )}
                                 {repoData.provider === 'gitlab' && (
                                    <>
                                       <p className="font-bold mb-2">GitLab Instructions:</p>
                                       <p className="mb-1"><strong>How to get Repository URL:</strong></p>
                                       <ol className="list-decimal ml-4 space-y-1 mb-3">
                                          <li>Go to your project on GitLab.com</li>
                                          <li>Click the <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Clone</code> button</li>
                                          <li>Copy the HTTPS URL (e.g., https://gitlab.com/username/repository)</li>
                                       </ol>
                                       <p className="mb-1"><strong>How to get Access Token:</strong></p>
                                       <ol className="list-decimal ml-4 space-y-1">
                                          <li>Go to GitLab Settings → Access Tokens</li>
                                          <li>Enter token name and expiration date</li>
                                          <li>Select scopes: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">read_repository</code>, <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">write_repository</code></li>
                                          <li>Click "Create personal access token"</li>
                                          <li>Copy the generated token</li>
                                       </ol>
                                    </>
                                 )}
                                 {repoData.provider === 'bitbucket' && (
                                    <>
                                       <p className="font-bold mb-2">Bitbucket Instructions:</p>
                                       <p className="mb-1"><strong>How to get Repository URL:</strong></p>
                                       <ol className="list-decimal ml-4 space-y-1 mb-3">
                                          <li>Go to your repository on Bitbucket.org</li>
                                          <li>Click the <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Clone</code> button in top right</li>
                                          <li>Copy the HTTPS URL (e.g., https://bitbucket.org/username/repository)</li>
                                       </ol>
                                       <p className="mb-1"><strong>How to get App Password:</strong></p>
                                       <ol className="list-decimal ml-4 space-y-1">
                                          <li>Go to Bitbucket Settings → Personal Bitbucket settings → App passwords</li>
                                          <li>Click "Create app password"</li>
                                          <li>Enter label and select permissions: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Repositories: Read</code>, <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">Write</code></li>
                                          <li>Click "Create"</li>
                                          <li>Copy the generated password</li>
                                       </ol>
                                    </>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                           Repository URL <span className="text-red-500">*</span>
                        </label>
                        <input
                           type="url"
                           value={repoData.url}
                           onChange={(e) => setRepoData({ ...repoData, url: e.target.value })}
                           required
                           className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-mono"
                           placeholder="https://github.com/username/repository"
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                           Access Token
                        </label>
                        <input
                           type="password"
                           value={repoData.accessToken}
                           onChange={(e) => setRepoData({ ...repoData, accessToken: e.target.value })}
                           className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-mono"
                           placeholder="ghp_xxxxxxxxxxxx"
                        />
                        <p className="text-xs text-gray-500 mt-1">Optional: Required for private repositories</p>
                     </div>

                     <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-zinc-700">
                        <button
                           type="button"
                           onClick={() => setIsRepoModalOpen(false)}
                           className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={isAddingRepo}
                           className="px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isAddingRepo ? (
                              <>
                                 <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                 Adding...
                              </>
                           ) : (
                              <>
                                 <i className="fa-solid fa-plus mr-2"></i>
                                 Add Repository
                              </>
                           )}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
         {/* Payment Confirmation Modal */}
         {isPaymentModalOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md" onClick={() => setIsPaymentModalOpen(false)}></div>
               <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl border border-gray-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white">Confirm Payment</h2>
                     <button onClick={() => setIsPaymentModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition">
                        <i className="fa-solid fa-times"></i>
                     </button>
                  </div>
                  <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Select Payment Method</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button type="button" onClick={() => setSelectedPaymentMethod('bank_transfer')} className={`p-4 rounded-xl border-2 transition ${selectedPaymentMethod === 'bank_transfer' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-zinc-700'}`}>
                              <i className="fa-solid fa-building-columns text-2xl mb-2"></i>
                              <p className="text-sm font-bold">Bank Transfer</p>
                           </button>
                           <button type="button" onClick={() => setSelectedPaymentMethod('card')} className={`p-4 rounded-xl border-2 transition ${selectedPaymentMethod === 'card' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-zinc-700'}`}>
                              <i className="fa-solid fa-credit-card text-2xl mb-2"></i>
                              <p className="text-sm font-bold">Card</p>
                           </button>
                           <button type="button" onClick={() => setSelectedPaymentMethod('cash')} className={`p-4 rounded-xl border-2 transition ${selectedPaymentMethod === 'cash' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-zinc-700'}`}>
                              <i className="fa-solid fa-money-bill text-2xl mb-2"></i>
                              <p className="text-sm font-bold">Cash</p>
                           </button>
                           <button type="button" onClick={() => setSelectedPaymentMethod('paypal')} className={`p-4 rounded-xl border-2 transition ${selectedPaymentMethod === 'paypal' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-zinc-700'}`}>
                              <i className="fa-brands fa-paypal text-2xl mb-2"></i>
                              <p className="text-sm font-bold">PayPal</p>
                           </button>
                           <button type="button" onClick={() => setSelectedPaymentMethod('crypto')} className={`p-4 rounded-xl border-2 transition ${selectedPaymentMethod === 'crypto' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-zinc-700'}`}>
                              <i className="fa-brands fa-bitcoin text-2xl mb-2"></i>
                              <p className="text-sm font-bold">Crypto</p>
                           </button>
                           <button type="button" onClick={() => setSelectedPaymentMethod('other')} className={`p-4 rounded-xl border-2 transition ${selectedPaymentMethod === 'other' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-zinc-700'}`}>
                              <i className="fa-solid fa-ellipsis text-2xl mb-2"></i>
                              <p className="text-sm font-bold">Other</p>
                           </button>
                        </div>
                     </div>
                     <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <div className="flex items-start gap-2">
                           <i className="fa-solid fa-info-circle text-blue-500 mt-0.5"></i>
                           <div className="text-xs text-gray-700 dark:text-gray-300">
                              <p className="font-bold mb-1">Amount: ${selectedOrder?.budget?.toLocaleString() || 0}</p>
                              <p>After confirmation, order status changes to "In Progress".</p>
                           </div>
                        </div>
                     </div>
                     <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
                        <button
                           onClick={() => setIsPaymentModalOpen(false)}
                           disabled={isSubmitting}
                           className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                        >
                           Cancel
                        </button>
                        <button
                           onClick={handleConfirmPayment}
                           disabled={isSubmitting}
                           className="px-6 py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                           {isSubmitting ? (
                              <>
                                 <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                 Processing...
                              </>
                           ) : (
                              <>
                                 <i className="fa-solid fa-check-circle mr-2"></i>
                                 Confirm Payment
                              </>
                           )}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Orders;