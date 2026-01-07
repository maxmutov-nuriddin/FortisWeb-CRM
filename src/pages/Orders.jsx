/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-dupe-keys */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Plot from 'react-plotly.js';
import { useCompanyStore } from '../store/company.store';
import { useProjectStore } from '../store/project.store';
import { usePaymentStore } from '../store/payment.store';
import { useAuthStore } from '../store/auth.store';
import PageLoader from '../components/loader/PageLoader';
import { useUserStore } from '../store/user.store';

const Orders = () => {
   const [statusFilter, setStatusFilter] = useState('All Statuses');
   const [dateFilter, setDateFilter] = useState('All Time');
   const [amountFilter, setAmountFilter] = useState('All Amounts');
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedOrder, setSelectedOrder] = useState(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isEditMode, setIsEditMode] = useState(false);
   const [isCreateMode, setIsCreateMode] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [paymentFormData, setPaymentFormData] = useState({
      paymentMethod: 'bank_transfer',
      status: 'pending'
   });

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
      clientUsername: '',
      selectedCompanyId: '',
      teamLead: '',
      assignedTeam: '',
      assignedMembers: []
   });

   const { user } = useAuthStore();
   const userData = user?.data?.user || user?.user || user;
   const isSuperAdmin = userData?.role === 'super_admin';

   const [viewCompanyId, setViewCompanyId] = useState('all');

   const { companies, getCompanies, getCompanyById, selectedCompany, isLoading: companiesLoading } = useCompanyStore();
   const {
      projects, getProjectsByCompany, getAllProjects, createProject, updateProject,
      deleteProject, assignProject, isLoading: projectsLoading
   } = useProjectStore();
   const { getUsersByCompany, isLoading: usersLoading, getAllUsers } = useUserStore();

   const { payments, getPaymentsByCompany, getAllPayments, confirmPayment, completePayment, createPayment, updatePayment } = usePaymentStore();

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
      if (isSuperAdmin && viewCompanyId === 'all') {
         getCompanies().then(camps => {
            const companyList = camps?.data?.companies || camps || [];
            if (companyList.length > 0) {
               getAllUsers(companyList.map(c => c._id).filter(Boolean));
            }
         });
      } else if (activeCompanyId && activeCompanyId !== 'all') {
         // Если это обычный админ компании, загружаем данные ЕГО компании (с командами)
         getCompanyById(activeCompanyId);
      }
   }, [isSuperAdmin, viewCompanyId, activeCompanyId, getCompanies, getCompanyById, getAllUsers]);

   const fetchData = async () => {
      if (isSuperAdmin && viewCompanyId === 'all') {
         if (allCompanies.length > 0) {
            const ids = allCompanies.map(c => c._id);
            await Promise.all([
               getAllProjects(ids),
               getAllPayments(ids)
            ]);
         }
      } else if (activeCompanyId && activeCompanyId !== 'all') {
         await Promise.all([
            getProjectsByCompany(activeCompanyId),
            getPaymentsByCompany(activeCompanyId),
            getUsersByCompany(activeCompanyId)
         ]);
      }
   };

   useEffect(() => {
      fetchData();
   }, [activeCompanyId, viewCompanyId, isSuperAdmin, allCompanies.length]);

   const allUsers = useMemo(() => {
      let aggregated = [];
      allCompanies.forEach(c => {
         if (c.employees) aggregated = [...aggregated, ...c.employees];
      });
      return aggregated;
   }, [allCompanies]);

   // ГЛОБАЛЬНЫЙ список команд для всех компаний (для резолва имен в модальном окне)
   const allTeams = useMemo(() => {
      let teams = [];
      allCompanies.forEach(c => {
         if (c.teams) {
            teams = [...teams, ...c.teams.map(t => ({ ...t, companyId: c._id }))];
         }
      });
      return teams;
   }, [allCompanies]);

   // ИСПРАВЛЕНО: Team Leads фильтруются по выбранной компании
   const availableLeads = useMemo(() => {
      const targetCompanyId = String(formData.selectedCompanyId || activeCompanyId || '');

      if (isSuperAdmin && !targetCompanyId) {
         // Если super admin и компания не выбрана, показываем всех team leads
         let allLeads = [];
         allCompanies.forEach(c => {
            if (c.employees) {
               const leads = c.employees.filter(u => u.role === 'team_lead');
               allLeads = [...allLeads, ...leads.map(l => ({ ...l, companyName: c.name }))];
            }
         });
         return allLeads;
      }

      if (targetCompanyId === 'all') {
         // Если выбрано "All Companies"
         let allLeads = [];
         allCompanies.forEach(c => {
            if (c.employees) {
               const leads = c.employees.filter(u => u.role === 'team_lead');
               allLeads = [...allLeads, ...leads.map(l => ({ ...l, companyName: c.name }))];
            }
         });
         return allLeads;
      }

      // Фильтруем по конкретной компании
      const company = allCompanies.find(c => String(c._id) === targetCompanyId);
      const employees = company?.employees || [];
      return employees.filter(u => u.role === 'team_lead');
   }, [allCompanies, formData.selectedCompanyId, activeCompanyId, isSuperAdmin]);

   // ИСПРАВЛЕНО: Teams фильтруются по выбранному Team Lead
   const availableTeams = useMemo(() => {
      const targetCompanyId = String(formData.selectedCompanyId || activeCompanyId || '');
      let teams = allTeams;

      // Фильтруем по компании
      if (targetCompanyId && targetCompanyId !== 'all') {
         teams = teams.filter(t => String(t.companyId || '') === targetCompanyId);
      }

      // ГЛАВНОЕ: Фильтруем по выбранному Team Lead
      if (formData.teamLead) {
         teams = teams.filter(t => String(t.teamLead?._id || t.teamLead || '') === String(formData.teamLead));
      }

      return teams;
   }, [allTeams, formData.selectedCompanyId, formData.teamLead, activeCompanyId]);

   // ИСПРАВЛЕНО: Члены команды из выбранной команды
   const availableMembers = useMemo(() => {
      if (!formData.assignedTeam) return [];

      const team = allTeams.find(t => String(t._id) === String(formData.assignedTeam));
      if (!team || !team.members || team.members.length === 0) return [];

      const targetCompanyId = String(formData.selectedCompanyId || activeCompanyId || '');
      const companyFound = allCompanies.find(c => String(c._id) === targetCompanyId);
      const companyEmployees = companyFound?.employees || allUsers;

      return team.members.map(m => {
         const uId = String(m._id || m.user?._id || m.user || m);
         const empFound = companyEmployees.find(e => String(e._id) === uId);
         return {
            id: uId,
            name: empFound?.name || m.name || m.user?.name || 'Unknown Member',
            role: empFound?.role || m.role || m.user?.role || 'member'
         };
      });
   }, [formData.assignedTeam, allTeams, allCompanies, formData.selectedCompanyId, activeCompanyId, allUsers]);


   const projectsList = useMemo(() => projects?.data?.projects || (Array.isArray(projects) ? projects : []), [projects]);
   const paymentsList = useMemo(() => payments?.data?.payments || payments?.payments || (Array.isArray(payments) ? payments : []), [payments]);

   const statusData = useMemo(() => {
      const statusLabels = ['Pending', 'In Progress', 'Review', 'Revision', 'Completed', 'Cancelled'];
      const statusValues = statusLabels.map(label => {
         const status = label.toLowerCase().replace(' ', '_');
         return projectsList.filter(p => {
            if (status === 'in_progress') return ['in_progress', 'assigned'].includes(p.status);
            return p.status === status;
         }).length;
      });

      return [{
         type: 'pie',
         labels: statusLabels,
         values: statusValues,
         marker: {
            colors: ['#EAB308', '#3B82F6', '#8B5CF6', '#A855F7', '#10B981', '#EF4444']
         },
         textinfo: 'label+percent',
         textfont: { color: '#FFFFFF', size: 11 },
         hovertemplate: '%{label}: %{value} orders<extra></extra>'
      }];
   }, [projectsList]);

   const trendData = useMemo(() => {
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         months.push(d.toLocaleString('default', { month: 'short' }));
      }

      const counts = months.map((month, idx) => {
         const checkDate = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
         const nextDate = new Date(now.getFullYear(), now.getMonth() - (4 - idx), 1);

         return projectsList.filter(p => {
            const pDate = new Date(p.createdAt);
            return pDate >= checkDate && pDate < nextDate;
         }).length;
      });

      return [{
         type: 'scatter',
         mode: 'lines',
         name: 'Orders',
         x: months,
         y: counts,
         line: { color: '#FF0000', width: 3 },
         fill: 'tozeroy',
         fillcolor: 'rgba(255, 0, 0, 0.1)'
      }];
   }, [projectsList]);

   const statusLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

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
      setIsSubmitting(true);

      try {
         if (isCreateMode) {
            if (!formData.title || !formData.budget) {
               toast.error('Title and Budget are required!', {
                  position: 'top-right',
                  autoClose: 5000,
                  closeOnClick: false,
                  draggable: false,
                  theme: 'dark',
               });
               setIsSubmitting(false);
               return;
            }

            const createData = {
               title: formData.title,
               description: formData.description || '',
               budget: parseFloat(formData.budget),
               status: 'pending', // Явно указываем статус "pending"
               deadline: formData.deadline,
               priority: formData.priority,
               client: {
                  name: formData.clientName || '',
                  username: formData.clientUsername || '',
                  email: formData.clientEmail || '',
                  phone: formData.clientPhone || '',
                  company: formData.clientCompany || ''
               },
               source: 'manual',
               teamLead: formData.teamLead || undefined,
               assignedTeam: formData.assignedTeam || undefined,
               assignedMembers: formData.assignedMembers?.map(userId => {
                  const member = availableMembers.find(m => String(m.id) === String(userId));
                  return { user: userId, role: member?.role || 'member' };
               }) || [],
               // backend expects 'company', but frontend sends 'companyId'?
               // matching the schema: company: { ref: 'Company', required: true }
               company: formData.selectedCompanyId || activeCompanyId || undefined
            };

            const result = await createProject(createData);
            const newProjectId = result?.data?.project?._id || result?._id;

            // Пытаемся автоматически создать платеж для нового проекта
            if (newProjectId) {
               try {
                  await createPayment({
                     amount: createData.budget,
                     project: newProjectId,
                     company: createData.company || activeCompanyId || null,
                     status: 'pending',
                     paymentMethod: paymentFormData.paymentMethod || 'bank_transfer',
                     description: `Initial payment for project: ${createData.title}`
                  });
                  // Принудительно обновляем данные
                  await fetchData();
               } catch (payErr) {
                  console.warn('Auto-payment creation failed during project creation:', payErr);
               }
            }

            // Если при создании сразу выбрана команда, вызываем /assign (так как бэкенд createProject не сохраняет эти поля)
            if (newProjectId && (formData.teamLead || formData.assignedTeam || formData.assignedMembers.length > 0)) {
               try {
                  const assignmentData = {
                     teamLeadId: formData.teamLead || undefined,
                     memberIds: formData.assignedMembers || [],
                     assignedMembers: createData.assignedMembers,
                     assignedTeamId: formData.assignedTeam || undefined,
                     status: 'pending' // Принудительно держим статус pending
                  };
                  await assignProject(newProjectId, assignmentData);
                  // Сразу после назначения принудительно устанавливаем pending, 
                  // на случай если бэкенд перевел его в in_progress при получении команды
                  await updateProject(newProjectId, { status: 'pending' });
               } catch (assignError) {
                  console.warn('Post-creation assignment failed (non-critical):', assignError);
               }
            }

            toast.success('Order created successfully!', {
               position: 'top-right',
               autoClose: 5000,
               closeOnClick: false,
               draggable: false,
               theme: 'dark',
            });
            closeModal();
         }
         else if (isEditMode && selectedOrder) {
            if (!formData.title || !formData.budget) {
               toast.error('Title and Budget are required!', {
                  position: 'top-right',
                  autoClose: 5000,
                  closeOnClick: false,
                  draggable: false,
                  theme: 'dark',
               });
               setIsSubmitting(false);
               return;
            }

            const updateData = {
               title: formData.title,
               description: formData.description || '',
               budget: parseFloat(formData.budget),
               status: formData.status,
               deadline: formData.deadline,
               priority: formData.priority,
               source: 'manual',
               teamLead: formData.teamLead || null,
               assignedTeam: formData.assignedTeam || null,
               assignedMembers: formData.assignedMembers?.map(userId => {
                  const member = availableMembers.find(m => String(m.id) === String(userId));
                  return { user: userId, role: member?.role || 'member' };
               }) || [],
               client: {
                  name: formData.clientName || '',
                  username: formData.clientUsername || '',
                  email: formData.clientEmail || '',
                  phone: formData.clientPhone || '',
                  company: formData.clientCompany || ''
               }
            };

            // Пытаемся сохранить назначение через специальный эндпоинт
            if (formData.teamLead || formData.assignedTeam || formData.assignedMembers.length > 0) {
               try {
                  const assignmentData = {
                     teamLeadId: formData.teamLead || undefined,
                     memberIds: formData.assignedMembers || [],
                     assignedMembers: updateData.assignedMembers,
                     assignedTeamId: formData.assignedTeam || undefined
                  };
                  await assignProject(selectedOrder._id, assignmentData);
               } catch (assignError) {
                  console.warn('Assignment specialized endpoint failed, falling back to general update:', assignError);
               }
            }

            await updateProject(selectedOrder._id, updateData);
            toast.success('Order updated successfully!', {
               position: 'top-right',
               autoClose: 5000,
               closeOnClick: false,
               draggable: false,
               theme: 'dark',
            });
            closeModal();
         }
      } catch (error) {
         console.error('Error saving order:', error);
         toast.error('Failed to save order: ', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         } + (error.response?.data?.message || error.message));
      } finally {
         setIsSubmitting(false);
      }
   };

   // ИСПРАВЛЕНО: Обработчик изменений
   const handleInputChange = (e) => {
      const { name, value, type, selectedOptions } = e.target;

      if (type === 'select-multiple') {
         const values = Array.from(selectedOptions).map(opt => opt.value);
         setFormData(prev => ({ ...prev, [name]: values }));
      } else if (name === 'selectedCompanyId') {
         // При смене компании сбрасываем все назначения
         setFormData(prev => ({
            ...prev,
            selectedCompanyId: value,
            teamLead: '',
            assignedTeam: '',
            assignedMembers: []
         }));
      } else if (name === 'teamLead') {
         if (!value) {
            setFormData(prev => ({ ...prev, teamLead: '', assignedTeam: '', assignedMembers: [] }));
            return;
         }

         // При выборе Team Lead проверяем его команды
         // Фильтруем из общего списка команд по компании и НОВОМУ лиду
         const targetCompanyId = String(formData.selectedCompanyId || activeCompanyId || '');
         const leadTeams = allTeams.filter(t =>
            String(t.companyId || '') === targetCompanyId &&
            String(t.teamLead?._id || t.teamLead || '') === String(value)
         );

         if (leadTeams.length === 1) {
            // Если у лида одна команда, автоматически выбираем её и её членов
            const team = leadTeams[0];
            setFormData(prev => ({
               ...prev,
               teamLead: value,
               assignedTeam: team._id,
               assignedMembers: team.members?.map(m => m.user?._id || m.user || m._id || m) || []
            }));
         } else {
            // Если команд несколько или нет, просто выбираем лида
            setFormData(prev => ({
               ...prev,
               teamLead: value,
               assignedTeam: '',
               assignedMembers: []
            }));
         }
      } else if (name === 'assignedTeam') {
         if (!value) {
            setFormData(prev => ({ ...prev, assignedTeam: '', assignedMembers: [] }));
            return;
         }
         // При выборе команды автоматически выбираем всех её членов
         const team = allTeams.find(t => String(t._id) === String(value));
         if (team) {
            setFormData(prev => ({
               ...prev,
               assignedTeam: value,
               teamLead: team.teamLead?._id || team.teamLead || prev.teamLead,
               assignedMembers: team.members?.map(m => m.user?._id || m.user || m._id || m) || []
            }));
         } else {
            setFormData(prev => ({ ...prev, [name]: value }));
         }
      } else {
         setFormData(prev => ({
            ...prev,
            [name]: value
         }));
      }
   };

   const resetForm = () => {
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
         clientUsername: '',
         selectedCompanyId: '',
         teamLead: '',
         assignedTeam: '',
         assignedMembers: []
      });
      setPaymentFormData({
         paymentMethod: 'bank_transfer',
         status: 'pending'
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
         budget: order.budget || '',
         description: order.description || '',
         status: order.status || 'pending',
         deadline: order.deadline ? new Date(order.deadline).toISOString().split('T')[0] : '',
         priority: order.priority || 'medium',
         clientName: order.client?.name || '',
         clientEmail: order.client?.email || '',
         clientPhone: order.client?.phone || '',
         clientCompany: order.client?.company || '',
         clientUsername: order.client?.username || '',
         selectedCompanyId: order.company?._id || order.company || activeCompanyId || '',
         teamLead: order.teamLead?._id || order.teamLead || '',
         assignedTeam: order.assignedTeam?._id || order.assignedTeam || '',
         assignedMembers: order.assignedMembers?.map(m => m.user?._id || m.user) || []
      });
      setIsModalOpen(true);
   };

   const handleDeleteOrder = async (e, orderId) => {
      e.stopPropagation();
      if (window.confirm('Are you sure you want to delete this order?')) {
         try {
            await deleteProject(orderId);
            toast.success('Order deleted successfully!', {
               position: 'top-right',
               autoClose: 5000,
               closeOnClick: false,
               draggable: false,
               theme: 'dark',
            });
         } catch (error) {
            console.error('Error deleting order:', error);
            toast.error('Failed to delete order: ' + (error.response?.data?.message || error.message), {
               position: 'top-right',
               autoClose: 5000,
               closeOnClick: false,
               draggable: false,
               theme: 'dark',
            });
         }
      }
   };

   const handleCreatePaymentManually = async (e, order) => {
      e.stopPropagation();
      try {
         await createPayment({
            amount: order.budget,
            project: order._id,
            company: order.company?._id || order.company,
            status: 'pending',
            paymentMethod: paymentFormData.paymentMethod || 'bank_transfer'
         });
         toast.success('Payment created successfully!', {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
         // После создания платежа, принудительно обновляем список платежей в store
         await fetchData();
      } catch (error) {
         console.error('Error creating payment:', error);
         toast.error('Failed to create payment: ' + (error.response?.data?.message || error.message), {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         });
      }
   };

   const handleViewDetails = (e, order) => {
      e.stopPropagation();
      setSelectedOrder(order);
      setIsEditMode(false);
      setIsCreateMode(false);

      const payment = (paymentsList || []).find(p => String(p.project?._id || p.project || '') === String(order._id));
      if (payment) {
         setPaymentFormData({
            paymentMethod: payment.paymentMethod || 'bank_transfer',
            status: payment.status || 'pending'
         });
      } else {
         setPaymentFormData({
            paymentMethod: 'bank_transfer',
            status: 'pending'
         });
      }

      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedOrder(null);
      setIsEditMode(false);
      setIsCreateMode(false);
      resetForm();
   };

   if (usersLoading && companiesLoading) {
      return <PageLoader />;
   }


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
                  {(user?.data?.user?.role === 'super_admin' || user?.role === 'super_admin') && (
                     <div className="flex-1 min-w-[200px]">
                        <label className="text-xs text-gray-400 mb-1 block">Filter by Company</label>
                        <select
                           className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full"
                           value={viewCompanyId}
                           onChange={(e) => setViewCompanyId(e.target.value)}
                        >
                           <option value="all">All Companies</option>
                           {allCompanies.map(company => (
                              <option key={company._id} value={company._id}>
                                 {company.name}
                              </option>
                           ))}
                        </select>
                     </div>
                  )}
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
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 relative">
                     {projectsLoading && projectsList.length > 0 && (
                        <tr className="absolute top-0 left-0 w-full h-1 z-10">
                           <td colSpan="9" className="p-0">
                              <div className="h-0.5 bg-dark-accent animate-pulse w-full"></div>
                           </td>
                        </tr>
                     )}
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
                                       <div className="text-xs text-gray-400">
                                          {allCompanies.find(c => c._id === (order.company?._id || order.company))?.name || 'Manual'}
                                       </div>
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
                                 {(() => {
                                    const payment = paymentsList.find(p => p.project?._id === order._id || p.project === order._id);
                                    if (!payment) return <span className="text-gray-500 text-[10px] italic">No payment</span>;

                                    let statusColor = 'text-gray-500 bg-gray-500';
                                    const statusText = payment.status || 'pending';

                                    switch (statusText) {
                                       case 'pending':
                                          statusColor = 'text-yellow-500 bg-yellow-500';
                                          break;
                                       case 'confirmed':
                                       case 'processing':
                                          statusColor = 'text-blue-500 bg-blue-500';
                                          break;
                                       case 'completed':
                                          statusColor = 'text-green-500 bg-green-500';
                                          break;
                                       case 'failed':
                                          statusColor = 'text-red-500 bg-red-500';
                                          break;
                                       default:
                                          statusColor = 'text-gray-400 bg-gray-400';
                                    }

                                    return (
                                       <div className="flex flex-col space-y-1">
                                          <span className={`px-2 py-0.5 bg-opacity-20 rounded-full text-[10px] font-medium w-fit ${statusColor}`}>
                                             {statusText.toUpperCase()}
                                          </span>
                                          <span className="text-[10px] text-gray-500 flex items-center">
                                             <i className="fa-solid fa-wallet mr-1"></i>
                                             {payment.paymentMethod || 'bank_transfer'}
                                          </span>
                                       </div>
                                    );
                                 })()}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center space-x-2">
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
                           <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
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

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">Project Title <span className="text-red-500">*</span></label>
                                 <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                    placeholder="e.g., Website Redesign"
                                    required
                                 />
                              </div>
                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">Budget <span className="text-red-500">*</span></label>
                                 <input
                                    type="number"
                                    name="budget"
                                    value={formData.budget}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                    placeholder="e.g., 1500"
                                    required
                                 />
                              </div>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">Deadline <span className="text-red-500">*</span></label>
                                 <input
                                    type="date"
                                    name="deadline"
                                    value={formData.deadline}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                    required
                                 />
                              </div>
                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">Priority</label>
                                 <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                 >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                 </select>
                              </div>
                           </div>

                           <div>
                              <label className="text-sm font-medium text-gray-300 block mb-2">Description</label>
                              <textarea
                                 name="description"
                                 value={formData.description}
                                 onChange={handleInputChange}
                                 rows="3"
                                 className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                 placeholder="Project details..."
                              ></textarea>
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

                           <div className="border-t border-gray-800 pt-4">
                              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Client Information</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">Client Name</label>
                                    <input
                                       type="text"
                                       name="clientName"
                                       value={formData.clientName}
                                       onChange={handleInputChange}
                                       className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                       placeholder="Full Name"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">Client Username</label>
                                    <input
                                       type="text"
                                       name="clientUsername"
                                       value={formData.clientUsername}
                                       onChange={handleInputChange}
                                       className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                       placeholder="@username"
                                    />
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                 <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">Client Email</label>
                                    <input
                                       type="email"
                                       name="clientEmail"
                                       value={formData.clientEmail}
                                       onChange={handleInputChange}
                                       className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                       placeholder="email@example.com"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">Client Phone</label>
                                    <input
                                       type="text"
                                       name="clientPhone"
                                       value={formData.clientPhone}
                                       onChange={handleInputChange}
                                       className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                       placeholder="+12345678"
                                    />
                                 </div>
                              </div>
                              <div className="mt-4">
                                 <label className="text-sm font-medium text-gray-300 block mb-2">Client Company</label>
                                 <input
                                    type="text"
                                    name="clientCompany"
                                    value={formData.clientCompany}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                    placeholder="Company Name"
                                 />
                              </div>
                           </div>

                           <div className="border-t border-gray-800 pt-4">
                              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Assignment</h3>
                              <div>
                                 <label className="text-sm font-medium text-gray-300 block mb-2">Team Lead</label>
                                 <select
                                    name="teamLead"
                                    value={formData.teamLead}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                 >
                                    <option value="">Select Team Lead ({availableLeads.length} available)</option>
                                    {availableLeads.map(user => (
                                       <option key={user._id} value={user._id}>
                                          {user.name} {user.companyName ? `(${user.companyName})` : ''}
                                       </option>
                                    ))}
                                 </select>
                              </div>
                              <div className="mt-4">
                                 <label className="text-sm font-medium text-gray-300 block mb-2">Team</label>
                                 <select
                                    name="assignedTeam"
                                    value={formData.assignedTeam}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent"
                                    disabled={!formData.teamLead}
                                 >
                                    <option value="">
                                       {!formData.teamLead
                                          ? 'Select a Team Lead first...'
                                          : `Select Team (${availableTeams.length} available)`}
                                    </option>
                                    {availableTeams.map(team => (
                                       <option key={team._id} value={team._id}>
                                          {team.name}
                                       </option>
                                    ))}
                                 </select>
                              </div>
                              <div className="mt-4">
                                 <label className="text-sm font-medium text-gray-300 block mb-2">Assigned Members</label>
                                 <select
                                    name="assignedMembers"
                                    multiple
                                    value={formData.assignedMembers}
                                    onChange={handleInputChange}
                                    className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-dark-accent h-32"
                                    disabled={!formData.assignedTeam}
                                 >
                                    {!formData.assignedTeam ? (
                                       <option disabled className="text-gray-500 italic">Select a team first...</option>
                                    ) : availableMembers.length === 0 ? (
                                       <option disabled className="text-gray-500 italic">No members found in this team</option>
                                    ) : (
                                       availableMembers.map((member) => (
                                          <option key={member.id} value={member.id}>
                                             {member.name} ({member.role.replace('_', ' ')})
                                          </option>
                                       ))
                                    )}
                                 </select>
                                 <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple members</p>
                              </div>
                           </div>



                           <div className="flex justify-end space-x-3 pt-6 border-t border-gray-800">
                              <button
                                 type="button"
                                 onClick={closeModal}
                                 className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition"
                              >
                                 Cancel
                              </button>
                              <button
                                 type="submit"
                                 disabled={isSubmitting}
                                 className={`bg-dark-accent hover:bg-red-600 text-white px-8 py-2.5 rounded-lg text-sm font-medium transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                 {isSubmitting ? 'Processing...' : (isCreateMode ? 'Create Order' : 'Save Changes')}
                              </button>
                           </div>
                        </form>
                     ) : (
                        <div className="space-y-6">
                           <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center">
                              <i className="fa-solid fa-circle-info mr-2 text-dark-accent"></i>
                              Order Details
                           </h3>
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
                              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Company Information</h3>
                              <div className="bg-dark-tertiary rounded-lg p-4">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-indigo-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                       <i className="fa-solid fa-building text-indigo-500"></i>
                                    </div>
                                    <div>
                                       <p className="text-white font-medium">
                                          {allCompanies.find(c => c._id === (selectedOrder.company?._id || selectedOrder.company))?.name || 'Manual Entry / Unknown'}
                                       </p>
                                       <p className="text-xs text-gray-500 italic">Project source entity</p>
                                    </div>
                                 </div>
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
                                       <div className="mt-4">
                                          <span className="text-xs text-gray-500 block">Date Created</span>
                                          <p className="text-white text-sm">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                       </div>
                                       <div className="mt-4">
                                          <span className="text-xs text-gray-500 block">Source</span>
                                          <p className="text-white text-sm capitalize">{selectedOrder.source || 'Manual'}</p>
                                       </div>
                                    </div>
                                    <div>
                                       <div>
                                          <span className="text-xs text-gray-500 block mb-1">Time Remaining</span>
                                          {(() => {
                                             const now = new Date();
                                             const deadline = new Date(selectedOrder.deadline);
                                             const diff = deadline - now;
                                             if (diff < 0) return <span className="text-red-500 text-xs font-bold uppercase">Overdue</span>;

                                             const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                             const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                                             if (days > 0) return <p className="text-green-500 text-sm font-bold">{days}d {hours}h left</p>;
                                             return <p className="text-yellow-500 text-sm font-bold">{hours}h left</p>;
                                          })()}
                                       </div>
                                       <div className="mt-4">
                                          <span className="text-xs text-gray-500 block">Deadline</span>
                                          <p className="text-white text-sm font-medium">{new Date(selectedOrder.deadline).toLocaleDateString()}</p>
                                       </div>
                                       <div className="mt-4">
                                          <span className="text-xs text-gray-500 block">Priority</span>
                                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold
                                             ${selectedOrder.priority === 'high' ? 'bg-red-500 bg-opacity-20 text-red-500' :
                                                selectedOrder.priority === 'low' ? 'bg-green-500 bg-opacity-20 text-green-500' :
                                                   'bg-yellow-500 bg-opacity-20 text-yellow-500'}`}>
                                             {selectedOrder.priority || 'Medium'}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                 <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Client Info</h3>
                                 <div className="bg-dark-tertiary rounded-lg p-4 flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg text-white font-bold">
                                       {selectedOrder.client?.name ? selectedOrder.client.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                       <p className="text-white font-medium">{selectedOrder.client?.name || 'Unknown Client'}</p>
                                       <p className="text-gray-500 text-sm">{selectedOrder.client?.username || selectedOrder.clientUsername || 'No username'}</p>
                                       <p className="text-gray-500 text-[10px] mt-1">ID: {selectedOrder.client?._id || 'N/A'}</p>
                                    </div>
                                 </div>
                              </div>
                              <div>
                                 <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Team & Manager</h3>
                                 <div className="bg-dark-tertiary rounded-lg p-4 space-y-4">
                                    <div>
                                       <span className="text-xs text-gray-500 block mb-1">Team & Lead</span>
                                       <div className="flex items-center space-x-2">
                                          <p className="text-white text-sm font-medium">
                                             {(() => {
                                                const team = selectedOrder.assignedTeam;
                                                if (!team) return 'No Team';
                                                const teamId = String(team?._id || team?.id || team);
                                                const teamFound = allTeams.find(t => String(t._id || t.id) === teamId);
                                                return teamFound?.name || team?.name || (typeof team === 'object' ? team.name : 'Unknown Team');
                                             })()}
                                          </p>
                                          <span className="text-gray-600">•</span>
                                          <p className="text-gray-400 text-xs">
                                             {(() => {
                                                const lead = selectedOrder.teamLead;
                                                if (!lead) return 'No Lead';
                                                const leadId = String(lead?._id || lead);

                                                const companyId = String(selectedOrder.company?._id || selectedOrder.company || '');
                                                const company = allCompanies.find(c => String(c._id) === companyId);
                                                const leadFound = (company?.employees || allUsers).find(e => String(e._id) === leadId);

                                                return leadFound?.name || (typeof lead === 'object' ? lead.name : 'Unknown');
                                             })()}
                                          </p>
                                       </div>
                                    </div>
                                    <div>
                                       <span className="text-xs text-gray-500 block mb-2">Assigned Members</span>
                                       <div className="grid grid-cols-1 gap-2">
                                          {(() => {
                                             const seen = new Set();
                                             const uniqueMembers = (selectedOrder.assignedMembers || []).filter(m => {
                                                const userRef = m.user || m;
                                                const uId = String(userRef?._id || userRef?.id || userRef);
                                                if (seen.has(uId)) return false;
                                                seen.add(uId);
                                                return true;
                                             });

                                             return uniqueMembers.length > 0 ? (
                                                uniqueMembers.map((m, i) => {
                                                   const userRef = m.user || m;
                                                   const uId = String(userRef?._id || userRef?.id || userRef);

                                                   const companyId = String(selectedOrder.company?._id || selectedOrder.company || '');
                                                   const company = allCompanies.find(c => String(c._id) === companyId);
                                                   const empFound = (company?.employees || allUsers).find(e => String(e._id || e.id) === uId);

                                                   const userName = empFound?.name || userRef?.name || m.name || 'Unknown Member';
                                                   const userRole = empFound?.role || userRef?.role || m.role || 'Member';
                                                   return (
                                                      <div key={i} className="flex items-center space-x-2 bg-dark-secondary/50 p-2 rounded-md border border-gray-800/50">
                                                         <div className="w-6 h-6 rounded-full bg-dark-accent/20 flex items-center justify-center text-[10px] text-dark-accent font-bold">
                                                            {userName.charAt(0).toUpperCase()}
                                                         </div>
                                                         <div className="flex flex-col">
                                                            <span className="text-white text-[11px] font-medium leading-none">{userName}</span>
                                                            <span className="text-gray-500 text-[9px] capitalize">{userRole.replace('_', ' ')}</span>
                                                         </div>
                                                      </div>
                                                   );
                                                })
                                             ) : <p className="text-gray-500 text-xs">No members assigned</p>;
                                          })()}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="border-t border-gray-800 pt-6">
                              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                                 <i className="fa-solid fa-credit-card mr-2 text-dark-accent"></i>
                                 Payment Information
                              </h3>
                              {(() => {
                                 const payment = paymentsList.find(p => {
                                    const pProjectId = String(p.project?._id || p.project || '');
                                    const sOrderId = String(selectedOrder._id || '');
                                    return pProjectId === sOrderId;
                                 });
                                 if (!payment) {
                                    return (
                                       <div className="bg-dark-tertiary rounded-xl p-8 border border-dashed border-gray-700/50 flex flex-col items-center justify-center text-center space-y-4">
                                          <div className="w-16 h-16 bg-dark-secondary rounded-full flex items-center justify-center text-gray-600 mb-2 border border-gray-800">
                                             <i className="fa-solid fa-file-invoice-dollar text-2xl"></i>
                                          </div>
                                          <div className="max-w-xs">
                                             <h4 className="text-white font-semibold text-sm mb-1">Missing Payment Record</h4>
                                             <p className="text-gray-500 text-xs">A financial record is required to track this project's revenue and team payouts.</p>
                                          </div>
                                          <div className="w-full max-w-sm pt-2">
                                             <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block font-bold">Select Payment Method</label>
                                             <div className="grid grid-cols-2 gap-2">
                                                <select
                                                   value={paymentFormData.paymentMethod || 'bank_transfer'}
                                                   onChange={(e) => {
                                                      const val = e.target.value;
                                                      setPaymentFormData(prev => ({ ...prev, paymentMethod: val }));
                                                   }}

                                                   className="col-span-2 bg-dark-secondary border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-dark-accent"
                                                >
                                                   <option value="bank_transfer">Bank Transfer</option>
                                                   <option value="cash">Cash</option>
                                                   <option value="card">Card</option>
                                                   <option value="paypal">PayPal</option>
                                                   <option value="crypto">Crypto</option>
                                                   <option value="other">Other</option>
                                                </select>
                                                <button
                                                   onClick={(e) => handleCreatePaymentManually(e, selectedOrder)}
                                                   className="col-span-2 bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center"
                                                >
                                                   <i className="fa-solid fa-plus mr-2"></i>
                                                   Create Initial Payment
                                                </button>
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 }

                                 return (
                                    <div className="bg-dark-tertiary rounded-lg p-5 space-y-4 border border-gray-700">
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div>
                                             <span className="text-xs text-gray-500 block mb-1">Payment Status</span>
                                             <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit
                                                   ${payment.status === 'completed' ? 'bg-green-500 bg-opacity-20 text-green-500' :
                                                      payment.status === 'confirmed' ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
                                                         'bg-yellow-500 bg-opacity-20 text-yellow-500'}`}>
                                                   {payment.status}
                                                </span>
                                             </div>
                                          </div>
                                          <div>
                                             <span className="text-xs text-gray-500 block mb-1">Amount</span>
                                             <p className="text-white font-bold">${(payment.amount || selectedOrder.budget || 0).toLocaleString()}</p>
                                          </div>
                                       </div>

                                       <div className="grid grid-cols-1 gap-4">
                                          <div>
                                             <span className="text-xs text-gray-500 block mb-1">Payment Method</span>
                                             <div className="flex items-center space-x-2">
                                                <select
                                                   value={paymentFormData.paymentMethod || payment.paymentMethod || 'bank_transfer'}
                                                   disabled={payment.status !== 'pending' || isSubmitting}
                                                   onChange={async (e) => {
                                                      const newVal = e.target.value;
                                                      setPaymentFormData(prev => ({ ...prev, paymentMethod: newVal }));
                                                      try {
                                                         await updatePayment(payment._id || payment.id, { paymentMethod: newVal });
                                                         toast.success(`Payment method updated to ${newVal}`, {
                                                            position: 'top-right',
                                                            autoClose: 5000,
                                                            closeOnClick: false,
                                                            draggable: false,
                                                            theme: 'dark',
                                                         });
                                                      } catch (err) {
                                                         toast.error('Failed to update payment method', {
                                                            position: 'top-right',
                                                            autoClose: 5000,
                                                            closeOnClick: false,
                                                            draggable: false,
                                                            theme: 'dark',
                                                         });
                                                      }
                                                   }}
                                                   className="flex-1 bg-dark-secondary text-white text-sm px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-dark-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                   <option value="bank_transfer">Bank Transfer</option>
                                                   <option value="cash">Cash</option>
                                                   <option value="card">Card</option>
                                                   <option value="paypal">PayPal</option>
                                                   <option value="crypto">Crypto</option>
                                                   <option value="other">Other</option>
                                                </select>
                                             </div>
                                          </div>
                                       </div>

                                       <div className="pt-2 border-t border-gray-700 flex flex-col space-y-2">
                                          {payment.status === 'pending' && (
                                             <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={async () => {
                                                   setIsSubmitting(true);
                                                   try {
                                                      await confirmPayment(payment._id || payment.id);
                                                      await fetchData().then(() => {
                                                         if (selectedOrder) {
                                                            const freshOrder = projects?.data?.projects?.find(p => String(p._id) === String(selectedOrder._id));
                                                            if (freshOrder) setSelectedOrder(freshOrder);
                                                         }
                                                      });
                                                      toast.success('Payment confirmed successfully!', {
                                                         position: 'top-right',
                                                         autoClose: 5000,
                                                         closeOnClick: false,
                                                         draggable: false,
                                                         theme: 'dark',
                                                      });
                                                   } catch (err) {
                                                      toast.error('Failed to confirm: ', {
                                                         position: 'top-right',
                                                         autoClose: 5000,
                                                         closeOnClick: false,
                                                         draggable: false,
                                                         theme: 'dark',
                                                      } + err.message);
                                                   } finally {
                                                      setIsSubmitting(false);
                                                   }
                                                }}
                                                className={`w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-bold transition flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                             >
                                                <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-check'} mr-1`}></i>
                                                {isSubmitting ? 'Confirming...' : 'Confirm Receipt (Money Received)'}
                                             </button>
                                          )}



                                          {/* STEP 2: Start Project */}
                                          {payment.status === 'confirmed' && selectedOrder.status === 'pending' && (
                                             <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={async () => {
                                                   setIsSubmitting(true);
                                                   try {
                                                      await updateProject(selectedOrder._id, { status: 'in_progress' });
                                                      await fetchData().then(() => {
                                                         if (selectedOrder) {
                                                            const freshOrder = projects?.data?.projects?.find(p => String(p._id) === String(selectedOrder._id));
                                                            if (freshOrder) setSelectedOrder(freshOrder);
                                                         }
                                                      });
                                                      toast.success('Project started! Status changed to In Progress.', {
                                                         position: 'top-right',
                                                         autoClose: 5000,
                                                         closeOnClick: false,
                                                         draggable: false,
                                                         theme: 'dark',
                                                      });
                                                   } catch (err) {
                                                      toast.error('Failed to start project: ', {
                                                         position: 'top-right',
                                                         autoClose: 5000,
                                                         closeOnClick: false,
                                                         draggable: false,
                                                         theme: 'dark',
                                                      } + err.message);
                                                   } finally {
                                                      setIsSubmitting(false);
                                                   }
                                                }}
                                                className={`w-full bg-dark-accent hover:bg-red-600 text-white px-3 py-2 rounded text-xs font-bold transition flex items-center justify-center mt-4 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                             >
                                                <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-play'} mr-1`}></i>
                                                {isSubmitting ? 'Starting...' : 'Start Translation (Move to In Progress)'}
                                             </button>
                                          )}

                                          {/* STEP 3: Complete Payment */}
                                          {payment.status === 'confirmed' && selectedOrder.status === 'in_progress' && (
                                             <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={async () => {
                                                   setIsSubmitting(true);
                                                   try {
                                                      await completePayment(payment._id || payment.id);
                                                      await fetchData().then(() => {
                                                         if (selectedOrder) {
                                                            const freshOrder = projects?.data?.projects?.find(p => String(p._id) === String(selectedOrder._id));
                                                            if (freshOrder) setSelectedOrder(freshOrder);
                                                         }
                                                      });
                                                      toast.success('Payment completed and salaries distributed!', {
                                                         position: 'top-right',
                                                         autoClose: 5000,
                                                         closeOnClick: false,
                                                         draggable: false,
                                                         theme: 'dark',
                                                      });
                                                   } catch (err) {
                                                      toast.error('Failed to complete payment: ', {
                                                         position: 'top-right',
                                                         autoClose: 5000,
                                                         closeOnClick: false,
                                                         draggable: false,
                                                         theme: 'dark',
                                                      } + err.message);
                                                   } finally {
                                                      setIsSubmitting(false);
                                                   }
                                                }}
                                                className={`w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-bold transition flex items-center justify-center mt-4 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                             >
                                                <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-check-double'} mr-1`}></i>
                                                {isSubmitting ? 'Completing...' : 'Complete Payment (Distribute Salaries)'}
                                             </button>
                                          )}
                                       </div>
                                    </div>
                                 );
                              })()}
                           </div>

                           {selectedOrder.results?.length > 0 && (
                              <div>
                                 <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Project Results</h3>
                                 <div className="bg-dark-tertiary rounded-lg p-4 space-y-2">
                                    {selectedOrder.results.map((res, i) => (
                                       <div key={i} className="flex items-center justify-between text-sm">
                                          <span className="text-gray-300">{res.name}</span>
                                          <a href={res.url} target="_blank" rel="noreferrer" className="text-dark-accent hover:underline">View File</a>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                              <button
                                 onClick={closeModal}
                                 className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition"
                              >
                                 Close
                              </button>
                              <div className="flex space-x-3">
                                 <button
                                    onClick={(e) => handleEditOrder(e, selectedOrder)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
                                 >
                                    <i className="fa-solid fa-edit"></i>
                                    <span>Edit Order</span>
                                 </button>
                              </div>
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