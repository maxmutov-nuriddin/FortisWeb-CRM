/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Sector, BarChart, Bar } from 'recharts';
import { useCompanyStore } from '../store/company.store';
import PageLoader from '../components/loader/PageLoader';
import { useAuthStore } from '../store/auth.store';
import { useUserStore } from '../store/user.store';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settings.store';

const Company = () => {
   const { t, i18n } = useTranslation();
   const { theme } = useSettingsStore();
   const [statusFilter, setStatusFilter] = useState(t('all_statuses'));
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedCompany, setSelectedCompany] = useState(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [showPassword, setShowPassword] = useState(false);


   const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      address: '',
      isActive: true,
      subscriptionTier: 'standard'
   });
   const [isEditMode, setIsEditMode] = useState(false);
   const [editingCompanyId, setEditingCompanyId] = useState(null);
   const [isSubmitting, setIsSubmitting] = useState(false);

   const { companies, getCompanies, createCompany, deleteCompany, updateCompany, updateCompanyStatus, updateDistributionRates, isLoading } = useCompanyStore();
   const { user } = useAuthStore();
   // eslint-disable-next-line no-unused-vars
   const { users, getUsersByCompany, createUser, updateUser, deleteUser } = useUserStore();

   const [isRatesEditing, setIsRatesEditing] = useState(false);
   const [ratesData, setRatesData] = useState({
      companyOwnerRate: undefined,  // ✅ NEW: undefined = legacy mode
      customAdminRate: 10,
      customTeamRate: 70,
      customCommissionRate: 20
   });

   useEffect(() => {
      if (isModalOpen && selectedCompany?._id) {
         getUsersByCompany(selectedCompany._id);
         const rates = selectedCompany.distributionRates || selectedCompany.settings || selectedCompany || {};
         setRatesData({
            companyOwnerRate: rates.companyOwner,  // ✅ undefined if not set (legacy mode)
            customAdminRate: rates.customAdminRate || rates.adminRate || 10,
            customTeamRate: rates.customTeamRate || rates.teamRate || 70,
            customCommissionRate: rates.customCommissionRate || rates.companyRate || 20  // ✅ DYNAMIC: Always load actual value
         });
         setIsRatesEditing(false);
      }
   }, [isModalOpen, selectedCompany, getUsersByCompany]);

   useEffect(() => {
      const userData = user?.data?.user || user;
      if (userData?.role === 'super_admin') {
         getCompanies();
      }
   }, [getCompanies, user]);

   const companiesList = useMemo(() => companies?.data?.companies || [], [companies]);

   // Data for Companies by Status (Donut Chart)
   const statusChartData = useMemo(() => [
      { name: t('active'), value: companiesList.filter(c => c.isActive === true).length, fill: '#10B981' },
      { name: t('inactive'), value: companiesList.filter(c => c.isActive === false).length, fill: '#EF4444' }
   ], [companiesList, t]);

   const [activeIndex, setActiveIndex] = useState(0);

   const onPieEnter = (_, index) => {
      setActiveIndex(index);
   };

   const renderActiveShape = (props) => {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, percent } = props;

      return (
         <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={theme === 'dark' ? '#FFF' : '#333'} className="text-2xl font-black">
               {`${(percent * 100).toFixed(0)}%`}
            </text>
            <Sector
               cx={cx}
               cy={cy}
               innerRadius={innerRadius}
               outerRadius={outerRadius}
               startAngle={startAngle}
               endAngle={endAngle}
               fill={fill}
            />
            <Sector
               cx={cx}
               cy={cy}
               startAngle={startAngle}
               endAngle={endAngle}
               innerRadius={outerRadius + 6}
               outerRadius={outerRadius + 10}
               fill={fill}
            />
         </g>
      );
   };

   // Data for Companies Growth Trend (Area Chart)
   const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
   const currentMonthIndex = new Date().getMonth();
   const months = monthOrder.slice(0, currentMonthIndex + 1);

   const growthChartData = useMemo(() => {
      return months.map(month => {
         const count = companiesList.filter(c => {
            if (!c.createdAt) return false;
            const monthStr = new Date(c.createdAt).toLocaleString(i18n.language || 'en-US', { month: 'short' });
            return monthStr === month;
         }).length;
         return { name: month, value: count };
      });
   }, [companiesList, months, i18n.language]);

   const filteredCompanies = useMemo(() => {
      let result = [...companiesList];

      if (statusFilter !== t('all_statuses')) {
         result = result.filter(company => {
            if (statusFilter === 'Active' || statusFilter === t('active')) return company.isActive === true;
            if (statusFilter === 'Inactive' || statusFilter === t('inactive')) return company.isActive === false;
            return true;
         });
      }

      if (searchQuery) {
         const query = searchQuery.toLowerCase();
         result = result.filter(company =>
            (company.name && company.name.toLowerCase().includes(query)) ||
            (company.email && company.email.toLowerCase().includes(query)) ||
            (company.address && company.address.toLowerCase().includes(query)) ||
            (company._id && company._id.toLowerCase().includes(query))
         );
      }

      const userData = user?.data?.user || user;
      const isAdmin = userData?.role === 'super_admin';

      if (!isAdmin) {
         const userCompanyId = String(userData?.company?._id || userData?.company || '');
         if (userCompanyId) {
            return companiesList.filter(c => String(c._id) === userCompanyId);
         }
      }

      return result;
   }, [companiesList, statusFilter, searchQuery, user, t]);

   const activeCompanies = useMemo(() => companiesList.filter(c => c.isActive === true), [companiesList]);
   const inactiveCompanies = useMemo(() => companiesList.filter(c => c.isActive === false), [companiesList]);
   const totalEmployees = useMemo(() => companiesList.reduce((sum, company) => sum + (company.employees?.length || 0), 0), [companiesList]);

   const handleViewDetails = (e, company) => {
      e.stopPropagation();
      setSelectedCompany(company);
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedCompany(null);
   };

   const handleEditCompany = (e, company) => {
      e.stopPropagation();
      setFormData({
         name: company.name || '',
         email: company.email || '',
         password: '',
         address: company.address || '',
         isActive: company.isActive ?? true,
         subscriptionTier: company.subscriptionType || 'standard'
      });
      setEditingCompanyId(company._id);
      setIsEditMode(true);
      setIsCreateModalOpen(true);
   };

   const handleStatusToggle = async (e, companyId, currentStatus) => {
      e.stopPropagation();
      try {
         await updateCompanyStatus(companyId, !currentStatus);
      } catch (error) {
         console.error('Error toggling status:', error);
      }
   };

   const openCreateModal = () => {
      setFormData({ name: '', email: '', password: '', address: '', isActive: true, subscriptionTier: 'standard' });
      setIsEditMode(false);
      setEditingCompanyId(null);
      setIsCreateModalOpen(true);
   };

   const closeCreateModal = () => {
      setIsCreateModalOpen(false);
      setIsEditMode(false);
      setEditingCompanyId(null);
      setFormData({ name: '', email: '', password: '', address: '', isActive: true, subscriptionTier: 'standard' });
   };

   const handleInputChange = (e) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         const finalData = { ...formData };
         if (finalData.email && !finalData.email.includes('@')) {
            finalData.email = finalData.email.trim() + '@gmail.com';
         }

         if (isEditMode && editingCompanyId) {
            const updateData = { ...finalData };
            if (!updateData.password) delete updateData.password;
            await updateCompany(editingCompanyId, updateData);
            toast.success(finalData.name + " Company updated successfully");
         } else {
            const response = await createCompany(finalData);
            toast.success(finalData.name + " Company created successfully");


         }
         closeCreateModal();
         await getCompanies();
      } catch (error) {
         console.error('Error submitting company:', error);
         toast.error('Failed to save company:' + (error.response?.data?.message || error.message));
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleDeleteCompany = async (companyId) => {
      if (window.confirm('Are you sure you want to delete this company?')) {
         try {
            await deleteCompany(companyId);
            closeModal();
            await getCompanies();
            toast.success('Company deleted successfully');
         } catch (error) {
            console.error('Error deleting company:', error);
            toast.error('Failed to delete company');
         }
      }
   };

   const handleSaveRates = async () => {
      // ✅ NEW: Calculate total based on mode
      const total = (ratesData.companyOwnerRate !== undefined ? ratesData.companyOwnerRate : 0) +
         ratesData.customAdminRate +
         ratesData.customTeamRate +
         ratesData.customCommissionRate;

      if (total !== 100) {
         toast.error(`The sum of percentages must be 100. Current total: ${total}%`);
         return;
      }

      try {
         await updateDistributionRates(selectedCompany._id, ratesData);
         toast.success('Distribution rates updated');
         setIsRatesEditing(false);
         setSelectedCompany(prev => ({ ...prev, distributionRates: { ...ratesData } }));
         getCompanies();
      } catch (error) {
         console.error(error);
         toast.error(error.response?.data?.message || 'Failed to update rates');
      }
   };

   if (isLoading) return <PageLoader />;

   return (
      <div className="min-h-screen p-6 lg:p-10 bg-gray-50/50 dark:bg-black text-gray-900 dark:text-white font-sans">
         <div className="max-w-[1600px] mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                     {(user?.data?.user?.role === 'super_admin' || user?.role === 'super_admin') ? t('companies_management') : t('my_company')}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                     {(user?.data?.user?.role === 'super_admin' || user?.role === 'super_admin') ? t('manage_all_companies_desc') : t('view_manage_company_desc')}
                  </p>
               </div>
               {(user?.data?.user?.role === 'super_admin' || user?.role === 'super_admin') && (
                  <button
                     onClick={openCreateModal}
                     className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                     <i className="fa-solid fa-plus"></i>
                     <span>{t('register_company')}</span>
                  </button>
               )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('total_companies')}</p>
                     <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{companiesList.length || 0}</div>
                     <div className="h-1 w-12 bg-blue-500 rounded-full"></div>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('active')}</p>
                     <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{activeCompanies.length || 0}</div>
                     <div className="h-1 w-12 bg-green-500 rounded-full"></div>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('inactive')}</p>
                     <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{inactiveCompanies.length || 0}</div>
                     <div className="h-1 w-12 bg-red-500 rounded-full"></div>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-yellow-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <div className="relative z-10">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('total_employees')}</p>
                     <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{totalEmployees || 0}</div>
                     <div className="h-1 w-12 bg-yellow-500 rounded-full"></div>
                  </div>
               </div>
            </div>

            {/* Filters & Table */}
            <div className="flex flex-col gap-6">
               {/* Filters */}
               <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                  <div className="relative flex-1 w-full sm:max-w-md">
                     <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                     <input
                        type="text"
                        placeholder={t('search_companies_placeholder')}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                     <select
                        className="px-4 py-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                     >
                        <option value={t('all_statuses')}>{t('all_statuses')}</option>
                        <option value="Active">{t('active')}</option>
                        <option value="Inactive">{t('inactive')}</option>
                     </select>
                     <button
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => { setStatusFilter(t('all_statuses')); setSearchQuery(''); }}
                        title={t('clear_filters')}
                     >
                        <i className="fa-solid fa-filter-circle-xmark text-lg"></i>
                     </button>
                  </div>
               </div>

               {/* Table */}
               <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full whitespace-nowrap">
                        <thead>
                           <tr className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 text-left">
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('company_id_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('name_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('email_address')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('created_date_th')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider">{t('status')}</th>
                              <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-wider text-right">{t('actions')}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                           {filteredCompanies.length > 0 ? (
                              filteredCompanies.map((company) => (
                                 <tr key={company._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-500 uppercase">
                                       #{company._id?.slice(-6) || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                             {company.name?.[0]?.toUpperCase()}
                                          </div>
                                          <span className="text-sm font-bold text-gray-900 dark:text-white">{company.name}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{company.email || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                       {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                       <button
                                          onClick={(e) => handleStatusToggle(e, company._id, company.isActive)}
                                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all ${company.isActive
                                             ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                                             : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                                             }`}
                                       >
                                          {company.isActive ? t('active') : t('inactive')}
                                       </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                          <button
                                             onClick={(e) => handleViewDetails(e, company)}
                                             className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                             title={t('view')}
                                          >
                                             <i className="fa-solid fa-eye text-xs"></i>
                                          </button>
                                          <button
                                             onClick={(e) => handleEditCompany(e, company)}
                                             className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                             title={t('edit')}
                                          >
                                             <i className="fa-solid fa-pen text-xs"></i>
                                          </button>
                                          <button
                                             onClick={() => handleDeleteCompany(company._id)}
                                             className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                             title={t('delete')}
                                          >
                                             <i className="fa-solid fa-trash text-xs"></i>
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr>
                                 <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                       <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                          <i className="fa-solid fa-building text-2xl text-gray-300 dark:text-zinc-600"></i>
                                       </div>
                                       <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Companies Found</h3>
                                       <p className="text-sm mt-1">{t('no_companies_found')}</p>
                                    </div>
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                     <i className="fa-solid fa-chart-pie text-gray-400"></i>
                     {t('companies_by_status')}
                  </h3>
                  <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                           <Pie
                              activeIndex={activeIndex}
                              activeShape={renderActiveShape}
                              data={statusChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={100}
                              dataKey="value"
                              onMouseEnter={onPieEnter}
                           >
                              {statusChartData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                           </Pie>
                           <Tooltip
                              content={({ active, payload }) => {
                                 if (active && payload && payload.length) {
                                    return (
                                       <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-zinc-700/50 min-w-[150px]">
                                          <div className="flex items-center gap-2 mb-2">
                                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }}></div>
                                             <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{payload[0].name}</p>
                                          </div>
                                          <p className="text-xl font-black text-gray-900 dark:text-white">
                                             {payload[0].value} {t('companies')}
                                          </p>
                                       </div>
                                    );
                                 }
                                 return null;
                              }}
                           />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                     <i className="fa-solid fa-chart-line text-gray-400"></i>
                     {t('companies_growth_trend')}
                  </h3>
                  <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={growthChartData}
                           margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                           barSize={40}
                        >
                           <defs>
                              <linearGradient id="colorGrowthBar" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                 <stop offset="95%" stopColor="#B91C1C" stopOpacity={0.8} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                           <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#6B7280', fontSize: 12, fontWeight: 600 }}
                              dy={10}
                           />
                           <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: theme === 'dark' ? '#9CA3AF' : '#6B7280', fontSize: 12, fontWeight: 600 }}
                           />
                           <Tooltip
                              cursor={{ fill: theme === 'dark' ? '#3F3F46' : '#F3F4F6', opacity: 0.4, radius: 4 }}
                              content={({ active, payload, label }) => {
                                 if (active && payload && payload.length) {
                                    return (
                                       <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/20 dark:border-zinc-700/50">
                                          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                                          <p className="text-lg font-bold text-red-500">
                                             {payload[0].value} {t('companies')}
                                          </p>
                                       </div>
                                    );
                                 }
                                 return null;
                              }}
                           />
                           <Bar dataKey="value" fill="url(#colorGrowthBar)" radius={[12, 12, 12, 12]} animationDuration={1500} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         </div>

         {/* Create/Edit Modal - keeping simple style for now */}
         {(isCreateModalOpen || (isModalOpen && selectedCompany)) && (
            // ... Modal logic retained but stylized if needed or kept simple
            // For brevity, assuming Modal components are separate or inline styles are sufficient as per original code logic but cleaned up
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md" onClick={() => { closeCreateModal(); closeModal(); }}></div>
               <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative z-10 shadow-2xl border border-gray-100 dark:border-zinc-800 custom-scrollbar">
                  {/* Content based on create vs view mode */}
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
                     {isCreateModalOpen ? (isEditMode ? 'Edit Company' : 'Register New Company') : 'Company Details'}
                  </h2>

                  {isCreateModalOpen ? (
                     <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Company Name" required className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl" />
                           <input name="email" type="email" value={formData.email} onChange={handleInputChange} onBlur={e => { const val = e.target.value; if (val && !val.includes('@')) { setFormData(prev => ({ ...prev, email: val.trim() + '@gmail.com' })); } }} placeholder="Email" required className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl" />
                           {!isEditMode && (
                              <div className="relative">
                                 <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl pr-12"
                                 />
                                 <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                 >
                                    {showPassword ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}
                                 </button>
                              </div>
                           )}
                           <input name="address" value={formData.address} onChange={handleInputChange} placeholder="Address" className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl" />
                        </div>
                        <button
                           type="submit"
                           disabled={isSubmitting}
                           className={`w-full text-white font-bold py-3 rounded-xl mt-4 transition-all flex items-center justify-center gap-2 ${isSubmitting
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5'
                              }`}
                        >
                           {isSubmitting ? (
                              <>
                                 <i className="fa-solid fa-circle-notch animate-spin"></i>
                                 <span>{isEditMode ? 'Saving...' : 'Creating Company & Admin...'}</span>
                              </>
                           ) : (
                              <span>{isEditMode ? 'Save Company' : 'Create Company'}</span>
                           )}
                        </button>
                     </form>
                  ) : (
                     <div className="space-y-6">
                        {/* Detail View Content */}
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
                           <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Distribution Rates</h3>
                           {/* ... Rates editor logic ... */}
                           {!isRatesEditing ? (
                              <div className={`grid gap-4 text-center ${ratesData.companyOwnerRate !== undefined ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                 {/* ✅ NEW: Show owner rate only if set (owner mode) */}
                                 {ratesData.companyOwnerRate !== undefined && (
                                    <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800/30">
                                       <div className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase">Owner</div>
                                       <div className="text-xl font-black text-purple-700 dark:text-purple-300">{ratesData.companyOwnerRate}%</div>
                                    </div>
                                 )}
                                 <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl">
                                    <div className="text-xs text-gray-400 font-bold uppercase">Admin</div>
                                    <div className="text-xl font-black text-gray-900 dark:text-white">{ratesData.customAdminRate}%</div>
                                 </div>
                                 <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl">
                                    <div className="text-xs text-gray-400 font-bold uppercase">Team</div>
                                    <div className="text-xl font-black text-gray-900 dark:text-white">{ratesData.customTeamRate}%</div>
                                 </div>
                                 <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl">
                                    <div className="text-xs text-gray-400 font-bold uppercase">Company</div>
                                    <div className="text-xl font-black text-gray-900 dark:text-white">{ratesData.customCommissionRate}%</div>
                                 </div>
                              </div>
                           ) : (
                              <div className="space-y-4">
                                 {/* ✅ Mode toggle - ONLY adds/removes field, doesn't change values */}
                                 <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-900/30">
                                    <input
                                       type="checkbox"
                                       id="ownerMode"
                                       checked={ratesData.companyOwnerRate !== undefined}
                                       onChange={(e) => {
                                          if (e.target.checked) {
                                             // ✅ DYNAMIC: Just add field with default, user can change
                                             setRatesData({
                                                ...ratesData,
                                                companyOwnerRate: 10  // Default, but editable
                                             });
                                          } else {
                                             // ✅ DYNAMIC: Just remove field, don't touch other values
                                             setRatesData({
                                                ...ratesData,
                                                companyOwnerRate: undefined
                                             });
                                          }
                                       }}
                                       className="w-4 h-4 text-red-600 rounded"
                                    />
                                    <label htmlFor="ownerMode" className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                       Enable Company Owner (adds 10% owner field)
                                    </label>
                                 </div>

                                 <div className={`grid gap-4 ${ratesData.companyOwnerRate !== undefined ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                    {/* ✅ Owner rate input (only in owner mode) */}
                                    {ratesData.companyOwnerRate !== undefined && (
                                       <div>
                                          <label className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase block mb-1">Owner %</label>
                                          <input
                                             type="number"
                                             value={ratesData.companyOwnerRate}
                                             onChange={e => setRatesData({ ...ratesData, companyOwnerRate: Number(e.target.value) })}
                                             className="w-full p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30 text-center font-bold"
                                          />
                                       </div>
                                    )}
                                    <div>
                                       <label className="text-xs text-gray-400 font-bold uppercase block mb-1">Admin %</label>
                                       <input type="number" value={ratesData.customAdminRate} onChange={e => setRatesData({ ...ratesData, customAdminRate: Number(e.target.value) })} className="w-full p-2 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-zinc-700 text-center font-bold" />
                                    </div>
                                    <div>
                                       <label className="text-xs text-gray-400 font-bold uppercase block mb-1">Team %</label>
                                       <input type="number" value={ratesData.customTeamRate} onChange={e => setRatesData({ ...ratesData, customTeamRate: Number(e.target.value) })} className="w-full p-2 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-zinc-700 text-center font-bold" />
                                    </div>
                                    <div>
                                       <label className="text-xs text-gray-400 font-bold uppercase block mb-1">Company %</label>
                                       <input type="number" value={ratesData.customCommissionRate} onChange={e => setRatesData({ ...ratesData, customCommissionRate: Number(e.target.value) })} className="w-full p-2 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-zinc-700 text-center font-bold" />
                                    </div>
                                 </div>

                                 {/* ✅ Total validation display */}
                                 <div className="text-center p-2 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Total: </span>
                                    <span className={`text-sm font-black ${((ratesData.companyOwnerRate || 0) + ratesData.customAdminRate + ratesData.customTeamRate + ratesData.customCommissionRate) === 100
                                       ? 'text-green-600 dark:text-green-400'
                                       : 'text-red-600 dark:text-red-400'
                                       }`}>
                                       {(ratesData.companyOwnerRate || 0) + ratesData.customAdminRate + ratesData.customTeamRate + ratesData.customCommissionRate}%
                                    </span>
                                 </div>
                              </div>
                           )}
                           <div className="mt-4 flex justify-end">
                              {!isRatesEditing ? (
                                 <button onClick={() => setIsRatesEditing(true)} className="text-sm font-bold text-red-500 hover:text-red-400">Edit Rates</button>
                              ) : (
                                 <div className="flex gap-2">
                                    <button onClick={handleSaveRates} className="text-sm font-bold text-green-500">Save</button>
                                    <button onClick={() => setIsRatesEditing(false)} className="text-sm font-bold text-gray-400">Cancel</button>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  <button onClick={() => { closeCreateModal(); closeModal(); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 hover:text-red-500">
                     <i className="fa-solid fa-times"></i>
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default Company;