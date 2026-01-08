import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { useCompanyStore } from '../store/company.store';
import PageLoader from '../components/loader/PageLoader';
import { useAuthStore } from '../store/auth.store';
import { useUserStore } from '../store/user.store';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const Company = () => {
   const { t, i18n } = useTranslation();
   const [statusFilter, setStatusFilter] = useState(t('all_statuses'));
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedCompany, setSelectedCompany] = useState(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);


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

   const { companies, getCompanies, createCompany, deleteCompany, updateCompany, updateCompanyStatus, updateDistributionRates, isLoading } = useCompanyStore();
   const { user } = useAuthStore();
   const { users, getUsersByCompany } = useUserStore();

   // Local state for rates editing in modal
   const [isRatesEditing, setIsRatesEditing] = useState(false);
   const [ratesData, setRatesData] = useState({
      adminRate: 10,
      teamRate: 70,
      companyRate: 20
   });

   useEffect(() => {
      if (isModalOpen && selectedCompany?._id) {
         getUsersByCompany(selectedCompany._id);
         setRatesData({
            adminRate: selectedCompany.distributionRates?.adminRate || 10,
            teamRate: selectedCompany.distributionRates?.teamRate || 70,
            companyRate: selectedCompany.distributionRates?.companyRate || 20
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

   const companiesList = companies?.data?.companies || [];

   const statusData = [{
      type: 'pie',
      labels: [t('active'), t('inactive')],
      values: [
         companiesList.filter(c => c.isActive === true).length,
         companiesList.filter(c => c.isActive === false).length
      ],
      marker: {
         colors: ['#10B981', '#EF4444']
      },
      textinfo: 'label+percent',
      textfont: { color: '#FFFFFF', size: 11 },
      hovertemplate: `%{label}: %{value} ${t('companies')}<extra></extra>`
   }];


   const statusLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
   const currentMonthIndex = new Date().getMonth();
   const months = monthOrder.slice(0, currentMonthIndex + 1);

   const yValues = months.map(month =>
      companiesList.filter(c => {
         if (!c.createdAt) return false;
         const monthStr = new Date(c.createdAt).toLocaleString(i18n.language || 'en-US', { month: 'short' });
         return monthStr === month;
      }).length
   );

   const trendData = [{
      type: 'scatter',
      mode: 'lines+markers',
      name: t('companies'),
      x: months,
      y: yValues,
      line: { color: '#FF0000', width: 3 },
      fill: 'tozeroy',
      fillcolor: 'rgba(255, 0, 0, 0.1)'
   }];

   const trendLayout = {
      autosize: true,
      title: { text: '', font: { size: 0 } },
      xaxis: { title: '', gridcolor: '#2A2A2A', color: '#9CA3AF' },
      yaxis: { title: t('companies'), gridcolor: '#2A2A2A', color: '#9CA3AF' },
      margin: { t: 20, r: 20, b: 40, l: 60 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false,
      hovermode: 'x unified'
   };

   const filteredCompaniesMemo = useMemo(() => {
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
   }, [companiesList, statusFilter, searchQuery, user]);

   const filteredCompanies = filteredCompaniesMemo || [];

   const activeCompanies = useMemo(() =>
      companiesList.filter(c => c.isActive === true), [companiesList]);
   const inactiveCompanies = useMemo(() =>
      companiesList.filter(c => c.isActive === false), [companiesList]);;

   const totalEmployees = useMemo(() => {
      return companiesList.reduce((sum, company) => sum + (company.employees?.length || 0), 0);
   }, [companiesList]);

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
         password: '', // Usually don't pre-fill password for edit
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
      setFormData({
         ...formData,
         [e.target.name]: e.target.value
      });
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      try {
         if (isEditMode && editingCompanyId) {
            // For update, we might not want to send password if it's empty
            const updateData = { ...formData };
            if (!updateData.password) delete updateData.password;
            await updateCompany(editingCompanyId, updateData);
            toast.success(formData.name + " Company updated successfully");
         } else {
            await createCompany(formData);
            toast.success(formData.name + " Company created successfully");
         }
         closeCreateModal();
         await getCompanies();
      } catch (error) {
         console.error('Error submitting company:', error);
         toast.error('Failed to save company:' + (error.response?.data?.message || error.message));
      }
   };

   const handleDeleteCompany = async (companyId) => {
      const ToastContent = ({ closeToast }) => (
         <div>
            <p>Are you sure you want to delete this company?</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
               <button
                  onClick={async () => {
                     closeToast();
                     try {
                        await deleteCompany(companyId);
                        closeModal();
                        await getCompanies();
                        toast.success('Company deleted successfully');
                     } catch (error) {
                        console.error('Error deleting company:', error);
                        toast.error('Failed to delete company');
                     }
                  }}
                  style={{
                     padding: '5px 15px',
                     background: '#ef4444',
                     border: 'none',
                     borderRadius: '4px',
                     color: 'white',
                     cursor: 'pointer'
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
                     cursor: 'pointer'
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

   const handleSaveRates = async () => {
      try {
         await updateDistributionRates(selectedCompany._id, ratesData);
         toast.success('Distribution rates updated');
         setIsRatesEditing(false);
         // Update selected company locally
         setSelectedCompany(prev => ({
            ...prev,
            distributionRates: { ...ratesData }
         }));
         getCompanies();
      } catch (error) {
         console.error(error);
         toast.error(error.response?.data?.message || 'Failed to update rates');
      }
   };

   if (isLoading) return <PageLoader />;

   return (
      <div className="p-8 space-y-8">
         <div id="companies-header-section">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                     {(user?.data?.user?.role === 'super_admin' || user?.role === 'super_admin') ? t('companies_management') : t('my_company')}
                  </h1>
                  <p className="text-gray-400">
                     {(user?.data?.user?.role === 'super_admin' || user?.role === 'super_admin') ? t('manage_all_companies_desc') : t('view_manage_company_desc')}
                  </p>
               </div>
               {(user?.data?.user?.role === 'super_admin' || user?.role === 'super_admin') && (
                  <div className="flex items-center space-x-3">
                     <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                        <i className="fa-solid fa-filter"></i>
                        <span>{t('filters')}</span>
                     </button>
                     <button
                        onClick={openCreateModal}
                        className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-3 shadow-lg shadow-red-900/20"
                     >
                        <i className="fa-solid fa-plus text-xs"></i>
                        <span>{t('register_company')}</span>
                     </button>
                  </div>
               )}
            </div>
         </div>

         <div id="companies-stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-building text-blue-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">{t('total_companies')}</h3>
               <p className="text-2xl font-bold text-white">{companiesList.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-check-circle text-green-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">{t('active')}</h3>
               <p className="text-2xl font-bold text-white">{activeCompanies.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-times-circle text-red-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">{t('inactive')}</h3>
               <p className="text-2xl font-bold text-white">{inactiveCompanies.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-users text-yellow-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">{t('total_employees')}</h3>
               <p className="text-2xl font-bold text-white">{totalEmployees || 0}</p>
            </div>
         </div>

         <div id="companies-filters-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap w-full">
                  <div className="w-full sm:w-auto flex-grow max-w-md">
                     <label className="text-xs text-gray-400 mb-1 block">{t('search_label')}</label>
                     <div className="relative">
                        <input
                           type="text"
                           placeholder={t('search_companies_placeholder')}
                           className="bg-dark-tertiary border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <i className="fa-solid fa-search absolute left-3 top-2.5 text-gray-500"></i>
                     </div>
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 mb-1 block">{t('status')}</label>
                     <select
                        className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dark-accent w-full sm:w-auto"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                     >
                        <option value={t('all_statuses')}>{t('all_statuses')}</option>
                        <option value="Active">{t('active')}</option>
                        <option value="Inactive">{t('inactive')}</option>
                     </select>
                  </div>
               </div>
               <button
                  className="text-dark-accent hover:text-red-600 text-sm font-medium transition self-start lg:self-center whitespace-nowrap"
                  onClick={() => {
                     setStatusFilter(t('all_statuses'));
                     setSearchQuery('');
                  }}
               >{t('clear_filters')}</button>
            </div>
         </div>

         <div id="companies-table-section" className="bg-dark-secondary border border-gray-800 rounded-xl overflow-hidden mb-8">
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead className="bg-dark-tertiary">
                     <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('company_id_th')}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('name_th')}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('email_address')}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('main_address')}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('created_date_th')}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('status')}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('actions')}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                     {filteredCompanies.length > 0 ? (
                        filteredCompanies.map((company, index) => (
                           <tr key={index} className="hover:bg-dark-tertiary transition">
                              <td className="px-6 py-4 text-sm text-white font-medium">
                                 #{company._id ? company._id.substring(company._id.length - 8).toUpperCase() : 'N/A'}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                                       {company.name ? company.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="text-sm text-white font-medium">{company.name || 'Unknown'}</div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">{company.email || 'No email'}</td>
                              <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate" title={company.address}>
                                 {company.address || 'No address'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                 <div>{company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center">
                                    <button
                                       onClick={(e) => handleStatusToggle(e, company._id, company.isActive)}
                                       className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${company.isActive ? 'bg-green-500' : 'bg-gray-700'
                                          }`}
                                    >
                                       <span
                                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${company.isActive ? 'translate-x-6' : 'translate-x-1'
                                             }`}
                                       />
                                    </button>
                                    <span className={`ml-3 text-xs font-medium ${company.isActive ? 'text-green-500' : 'text-red-500'}`}>
                                       {company.isActive ? t('active') : t('inactive')}
                                    </span>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center space-x-2">
                                    <button
                                       onClick={(e) => handleViewDetails(e, company)}
                                       className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                    >
                                       {t('view')}
                                    </button>
                                    <button
                                       onClick={(e) => handleEditCompany(e, company)}
                                       className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                    >
                                       {t('edit')}
                                    </button>
                                    <button
                                       onClick={() => handleDeleteCompany(company._id)}
                                       className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                    >
                                       {t('delete')}
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                              <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-50"></i>
                              <p>{t('no_companies_found')}</p>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         <div id="companies-chart-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">{t('companies_by_status')}</h3>
                  <p className="text-sm text-gray-400">{t('status_dist_desc', 'Distribution of company statuses')}</p>
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
                  <h3 className="text-lg font-semibold text-white mb-1">{t('companies_growth_trend')}</h3>
                  <p className="text-sm text-gray-400">{t('company_registrations_desc')}</p>
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

         {/* Company Details Modal */}
         {isModalOpen && selectedCompany && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
               <div className="bg-dark-secondary border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-dark-tertiary">
                     <h2 className="text-xl font-bold text-white">{t('company_details')}</h2>
                     <button onClick={closeModal} className="text-gray-400 hover:text-white transition">
                        <i className="fa-solid fa-times text-xl"></i>
                     </button>
                  </div>

                  <div className="p-6 space-y-6">
                     <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                           <span className="text-xs text-gray-500 block mb-1">{t('company_id_th')}</span>
                           <span className="text-white font-mono bg-dark-tertiary px-2 py-1 rounded text-sm">
                              #{selectedCompany._id || 'N/A'}
                           </span>
                        </div>
                        <div>
                           <span className="text-xs text-gray-500 block mb-1">{t('status')}</span>
                           <span
                              className={`px-3 py-1 bg-opacity-20 rounded-full text-xs font-medium inline-block
    ${selectedCompany.isActive === true ? 'text-green-500 bg-green-500' :
                                    selectedCompany.isActive === false ? 'text-red-500 bg-red-500' :
                                       'text-gray-500 bg-gray-500'}`}
                           >
                              {selectedCompany.isActive ? 'Active' : 'Inactive'}
                           </span>

                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('company_information')}</h3>
                           <div className="bg-dark-tertiary rounded-lg p-4 space-y-3 h-full">
                              <div>
                                 <span className="text-xs text-gray-500 block">{t('company_name')}</span>
                                 <p className="text-white font-medium">{selectedCompany.name || 'No Name'}</p>
                              </div>
                              <div>
                                 <span className="text-xs text-gray-500 block">{t('email_address')}</span>
                                 <p className="text-gray-300 text-sm">{selectedCompany.email || 'No Email'}</p>
                              </div>
                              <div>
                                 <span className="text-xs text-gray-500 block">{t('main_address')}</span>
                                 <p className="text-gray-300 text-sm">{selectedCompany.address || 'No Address'}</p>
                              </div>
                              <div>
                                 <span className="text-xs text-gray-500 block">{t('subscription_tier')}</span>
                                 <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase border ${selectedCompany.subscriptionType === 'enterprise' ? 'border-purple-500 text-purple-400' :
                                    selectedCompany.subscriptionType === 'premium' ? 'border-yellow-500 text-yellow-400' :
                                       'border-gray-500 text-gray-400'
                                    }`}>
                                    {selectedCompany.subscriptionType || 'Standard'}
                                 </span>
                              </div>
                              <div className="pt-3 border-t border-gray-700">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-gray-400 uppercase font-semibold">Distribution Rates</span>
                                    {user?.data?.user?.role === 'super_admin' && (
                                       !isRatesEditing ? (
                                          <button onClick={() => setIsRatesEditing(true)} className="text-dark-accent text-xs hover:underline">Edit</button>
                                       ) : (
                                          <div className="flex space-x-2">
                                             <button onClick={handleSaveRates} className="text-green-500 text-xs hover:underline">Save</button>
                                             <button onClick={() => setIsRatesEditing(false)} className="text-gray-400 text-xs hover:underline">Cancel</button>
                                          </div>
                                       )
                                    )}
                                 </div>

                                 {!isRatesEditing ? (
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                       <div className="bg-gray-800 p-2 rounded">
                                          <span className="block text-[10px] text-gray-500">Admin</span>
                                          <span className="text-white font-bold">{selectedCompany.distributionRates?.adminRate || 10}%</span>
                                       </div>
                                       <div className="bg-gray-800 p-2 rounded">
                                          <span className="block text-[10px] text-gray-500">Team</span>
                                          <span className="text-white font-bold">{selectedCompany.distributionRates?.teamRate || 70}%</span>
                                       </div>
                                       <div className="bg-gray-800 p-2 rounded">
                                          <span className="block text-[10px] text-gray-500">Company</span>
                                          <span className="text-white font-bold">{selectedCompany.distributionRates?.companyRate || 20}%</span>
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="space-y-2">
                                       <div className="flex items-center justify-between">
                                          <label className="text-xs text-gray-400">Admin %</label>
                                          <input
                                             type="number"
                                             value={ratesData.adminRate}
                                             onChange={e => setRatesData({ ...ratesData, adminRate: Number(e.target.value) })}
                                             className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-right text-white"
                                          />
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <label className="text-xs text-gray-400">Team %</label>
                                          <input
                                             type="number"
                                             value={ratesData.teamRate}
                                             onChange={e => setRatesData({ ...ratesData, teamRate: Number(e.target.value) })}
                                             className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-right text-white"
                                          />
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <label className="text-xs text-gray-400">Company %</label>
                                          <input
                                             type="number"
                                             value={ratesData.companyRate}
                                             onChange={e => setRatesData({ ...ratesData, companyRate: Number(e.target.value) })}
                                             className="w-16 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-right text-white"
                                          />
                                       </div>
                                       <div className="text-[10px] text-gray-500 text-right">
                                          Total: {ratesData.adminRate + ratesData.teamRate + ratesData.companyRate}%
                                       </div>
                                    </div>
                                 )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                 <div>
                                    <span className="text-xs text-gray-500 block">Created Date</span>
                                    <p className="text-white text-sm">
                                       {selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                 </div>
                                 <div>
                                    <span className="text-xs text-gray-500 block">Total Teams</span>
                                    <p className="text-white text-sm font-bold">{selectedCompany.teams?.length || 0}</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div>
                           <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Teams & Employees</h3>
                           <div className="bg-dark-tertiary rounded-lg p-4 space-y-4 max-h-[300px] overflow-y-auto">
                              {selectedCompany && selectedCompany.teams && selectedCompany.teams.length > 0 ? (
                                 selectedCompany.teams.map((team, tIdx) => {
                                    return (
                                       <div key={tIdx} className="border-b border-gray-700 pb-3 last:border-0 last:pb-0">
                                          <div className="flex justify-between items-center mb-2">
                                             <h4 className="text-indigo-400 font-medium text-sm">{team.name}</h4>
                                             <span className="text-[10px] bg-indigo-500 bg-opacity-20 text-indigo-400 px-2 py-0.5 rounded">Team</span>
                                          </div>
                                          <div className="space-y-1">
                                             {team.members && team.members.length > 0 ? (
                                                team.members.map((memberId, mIdx) => {
                                                   const userData = users?.data?.users?.find(u => u._id === memberId);
                                                   return (
                                                      <div key={mIdx} className="flex items-center space-x-2 text-xs text-gray-400">
                                                         <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-[10px]">
                                                            {userData?.name?.charAt(0) || userData?.username?.charAt(0) || 'U'}
                                                         </div>
                                                         <span>{userData?.name || userData?.username || `User ${memberId}`}</span>
                                                         <span className="text-[10px] text-gray-600 uppercase italic">
                                                            {userData?.role}
                                                         </span>
                                                      </div>
                                                   );
                                                })
                                             ) : (
                                                <p className="text-[10px] text-gray-600 italic">No members in this team</p>
                                             )}
                                          </div>
                                       </div>
                                    );
                                 })
                              ) : (
                                 <div className="text-center py-4">
                                    <i className="fa-solid fa-users-slash text-gray-600 text-3xl mb-2 opacity-50"></i>
                                    <p className="text-xs text-gray-500">No teams or members registered</p>
                                 </div>
                              )}
                           </div>
                           <div className="mt-4 p-3 bg-indigo-500 bg-opacity-10 border border-indigo-500 border-opacity-20 rounded-lg">
                              <div className="flex justify-between items-center">
                                 <span className="text-xs text-indigo-400">Current Status</span>
                                 <button
                                    onClick={(e) => handleStatusToggle(e, selectedCompany._id, selectedCompany.isActive)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${selectedCompany.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                       }`}
                                 >
                                    {selectedCompany.isActive ? t('active') : t('inactive')}
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                        <button
                           onClick={() => handleDeleteCompany(selectedCompany._id)}
                           className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
                        >
                           <i className="fa-solid fa-trash"></i>
                           <span>Delete Company</span>
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Create Company Modal */}
         {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
               <div className="bg-dark-secondary border border-gray-800 rounded-xl w-full max-w-2xl">
                  <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-dark-tertiary">
                     <h2 className="text-xl font-bold text-white">{isEditMode ? 'Edit Company' : 'Create New Company'}</h2>
                     <button onClick={closeCreateModal} className="text-gray-400 hover:text-white transition">
                        <i className="fa-solid fa-times text-xl"></i>
                     </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="text-sm text-gray-400 block mb-2">Company Name *</label>
                           <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                              placeholder="Enter company name"
                           />
                        </div>

                        <div>
                           <label className="text-sm text-gray-400 block mb-2">Email *</label>
                           <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                              disabled={isEditMode}
                              className={`w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                              placeholder="Enter email address"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="text-sm text-gray-400 block mb-2">
                              {isEditMode ? 'New Password (leave blank to keep current)' : 'Password *'}
                           </label>
                           <input
                              type="password"
                              name="password"
                              value={formData.password}
                              onChange={handleInputChange}
                              required={!isEditMode}
                              className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                              placeholder={isEditMode ? 'Enter new password' : 'Enter password'}
                           />
                        </div>

                        <div>
                           <label className="text-sm text-gray-400 block mb-2">Status</label>
                           <div className="flex items-center space-x-4 mt-2">
                              <label className="flex items-center cursor-pointer">
                                 <input
                                    type="radio"
                                    name="isActive"
                                    checked={formData.isActive === true}
                                    onChange={() => setFormData({ ...formData, isActive: true })}
                                    className="hidden"
                                 />
                                 <div className={`px-4 py-2 rounded-lg text-xs font-medium transition ${formData.isActive === true ? 'bg-green-500 text-white' : 'bg-dark-tertiary text-gray-400'}`}>
                                    Active
                                 </div>
                              </label>
                              <label className="flex items-center cursor-pointer">
                                 <input
                                    type="radio"
                                    name="isActive"
                                    checked={formData.isActive === false}
                                    onChange={() => setFormData({ ...formData, isActive: false })}
                                    className="hidden"
                                 />
                                 <div className={`px-4 py-2 rounded-lg text-xs font-medium transition ${formData.isActive === false ? 'bg-red-500 text-white' : 'bg-dark-tertiary text-gray-400'}`}>
                                    Inactive
                                 </div>
                              </label>
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="text-sm text-gray-400 block mb-2">Subscription Tier</label>
                        <select
                           name="subscriptionTier"
                           value={formData.subscriptionTier}
                           onChange={handleInputChange}
                           className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                        >
                           <option value="standard">Standard</option>
                           <option value="premium">Premium</option>
                           <option value="enterprise">Enterprise</option>
                        </select>
                     </div>

                     <div>
                        <label className="text-sm text-gray-400 block mb-2">Address *</label>
                        <input
                           type="text"
                           name="address"
                           value={formData.address}
                           onChange={handleInputChange}
                           required
                           className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                           placeholder="Enter company address"
                        />
                     </div>

                     <div className="flex justify-end space-x-3 pt-4">
                        <button
                           type="button"
                           onClick={closeCreateModal}
                           className="bg-transparent hover:bg-gray-700 text-gray-300 px-6 py-2.5 rounded-lg text-sm font-medium transition border border-gray-600"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition shadow-lg shadow-red-900/20"
                        >
                           {isEditMode ? 'Update Company' : 'Create Company'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default Company;