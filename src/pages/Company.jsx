import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { useCompanyStore } from '../store/company.store';
import PageLoader from '../components/loader/PageLoader';

const Company = () => {
   const [statusFilter, setStatusFilter] = useState('All Statuses');
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedCompany, setSelectedCompany] = useState(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

   const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      address: ''
   });

   const { companies, getCompanies, createCompany, deleteCompany, isLoading } = useCompanyStore();

   useEffect(() => {
      getCompanies();
   }, [getCompanies]);

   const companiesList = companies?.data?.companies || [];

   const statusData = [{
      type: 'pie',
      labels: ['Active', 'Inactive'],  // better to use strings instead of booleans
      values: [
         companiesList.filter(c => c.isActive === true).length,
         companiesList.filter(c => c.isActive === false).length
      ],
      marker: {
         colors: ['#10B981', '#EF4444'] // green for active, red for inactive
      },
      textinfo: 'label+percent',
      textfont: { color: '#FFFFFF', size: 11 },
      hovertemplate: '%{label}: %{value} companies<extra></extra>'
   }];


   const statusLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   // 1. Создаем массив месяцев с начала года до текущего месяца
   const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
   const currentMonthIndex = new Date().getMonth(); // 0 = Jan, 1 = Feb...
   const months = monthOrder.slice(0, currentMonthIndex + 1);

   // 2. Считаем количество компаний по месяцам
   const yValues = months.map(month =>
      companiesList.filter(c => {
         if (!c.createdAt) return false;
         const monthStr = new Date(c.createdAt).toLocaleString('en-US', { month: 'short' });
         return monthStr === month;
      }).length
   );

   // 3. Создаем график Plotly
   const trendData = [{
      type: 'scatter',
      mode: 'lines+markers',  // добавил точки, чтобы было видно, где значения
      name: 'Companies',
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
      yaxis: { title: 'Companies', gridcolor: '#2A2A2A', color: '#9CA3AF' },
      margin: { t: 20, r: 20, b: 40, l: 60 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false,
      hovermode: 'x unified'
   };

   const filteredCompanies = useMemo(() => {
      let result = [...companiesList];

      if (statusFilter !== 'All Statuses') {
         result = result.filter(company => {
            if (statusFilter === 'Active') return company.isActive === true;
            if (statusFilter === 'Inactive') return company.isActive === false;
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

      return result;
   }, [companiesList, statusFilter, searchQuery]);

   const activeCompanies = useMemo(() =>
      companiesList.filter(c => c.isActive === true), [companiesList]);
   const inactiveCompanies = useMemo(() =>
      companiesList.filter(c => c.isActive === false), [companiesList]);;



   const totalEmployees = useMemo(() => {
      if (!Array.isArray(companies)) return 0;
      return companies.reduce((sum, company) => sum + (company.employees?.length || 0), 0);
   }, [companies]);





   const handleViewDetails = (e, company) => {
      e.stopPropagation();
      setSelectedCompany(company);
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedCompany(null);
   };

   const openCreateModal = () => {
      setFormData({ name: '', email: '', password: '', address: '' });
      setIsCreateModalOpen(true);
   };

   const closeCreateModal = () => {
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', password: '', address: '' });
   };

   const handleInputChange = (e) => {
      setFormData({
         ...formData,
         [e.target.name]: e.target.value
      });
   };

   const handleCreateCompany = async (e) => {
      e.preventDefault();
      try {
         await createCompany(formData);
         closeCreateModal();
         await getCompanies();
      } catch (error) {
         console.error('Error creating company:', error);
      }
   };

   const handleDeleteCompany = async (companyId) => {
      if (window.confirm('Are you sure you want to delete this company?')) {
         try {
            await deleteCompany(companyId);
            closeModal();
            await getCompanies();
         } catch (error) {
            console.error('Error deleting company:', error);
         }
      }
   };



   if (isLoading) return (
      <PageLoader />
   );

   return (
      <div className="p-8 space-y-8">
         <div id="companies-header-section">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Companies Management</h1>
                  <p className="text-gray-400">Manage all companies in the system</p>
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
                     onClick={openCreateModal}
                     className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                     <i className="fa-solid fa-plus"></i>
                     <span>Add New Company</span>
                  </button>
               </div>
            </div>
         </div>

         <div id="companies-stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-building text-blue-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Total Companies</h3>
               <p className="text-2xl font-bold text-white">{companiesList.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-check-circle text-green-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Active</h3>
               <p className="text-2xl font-bold text-white">{activeCompanies.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-times-circle text-red-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Inactive</h3>
               <p className="text-2xl font-bold text-white">{inactiveCompanies.length || 0}</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-dark-accent transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-users text-yellow-500 text-xl"></i>
                  </div>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Total Employees</h3>
               <p className="text-2xl font-bold text-white">{totalEmployees || 0}</p>
            </div>
         </div>

         <div id="companies-filters-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap w-full">
                  <div className="w-full sm:w-auto flex-grow max-w-md">
                     <label className="text-xs text-gray-400 mb-1 block">Search</label>
                     <div className="relative">
                        <input
                           type="text"
                           placeholder="Search by Name, Email, or Address..."
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
                        <option>Active</option>
                        <option>Inactive</option>
                     </select>
                  </div>
               </div>
               <button
                  className="text-dark-accent hover:text-red-600 text-sm font-medium transition self-start lg:self-center whitespace-nowrap"
                  onClick={() => {
                     setStatusFilter('All Statuses');
                     setSearchQuery('');
                  }}
               >Clear Filters</button>
            </div>
         </div>

         <div id="companies-table-section" className="bg-dark-secondary border border-gray-800 rounded-xl overflow-hidden mb-8">
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead className="bg-dark-tertiary">
                     <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Company ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Address</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Created Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
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
                                 <div className="text-xs text-gray-500">
                                    {company.createdAt ? new Date(company.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 {(() => {
                                    let statusColor = 'text-gray-500 bg-gray-500';
                                    let statusText = 'Unknown';

                                    if (company.isActive === true || company.isActive === 'true') {
                                       statusColor = 'text-green-500 bg-green-500';
                                       statusText = 'Active';
                                    } else if (company.isActive === false || company.isActive === 'false') {
                                       statusColor = 'text-red-500 bg-red-500';
                                       statusText = 'Inactive';
                                    }

                                    return (
                                       <span className={`px-3 py-1 bg-opacity-20 rounded-full text-xs font-medium ${statusColor}`}>
                                          {statusText}
                                       </span>
                                    );
                                 })()}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center space-x-2">
                                    <button
                                       onClick={(e) => handleViewDetails(e, company)}
                                       className="bg-dark-accent hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                    >
                                       View Details
                                    </button>
                                    <button
                                       onClick={() => handleDeleteCompany(company._id)}
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
                           <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                              <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-50"></i>
                              <p>No companies found matching your filters</p>
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
                  <h3 className="text-lg font-semibold text-white mb-1">Companies by Status</h3>
                  <p className="text-sm text-gray-400">Distribution of company statuses</p>
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
                  <h3 className="text-lg font-semibold text-white mb-1">Companies Growth Trend</h3>
                  <p className="text-sm text-gray-400">Company registrations over time</p>
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
                     <h2 className="text-xl font-bold text-white">Company Details</h2>
                     <button onClick={closeModal} className="text-gray-400 hover:text-white transition">
                        <i className="fa-solid fa-times text-xl"></i>
                     </button>
                  </div>

                  <div className="p-6 space-y-6">
                     <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                           <span className="text-xs text-gray-500 block mb-1">Company ID</span>
                           <span className="text-white font-mono bg-dark-tertiary px-2 py-1 rounded text-sm">
                              #{selectedCompany._id || 'N/A'}
                           </span>
                        </div>
                        <div>
                           <span className="text-xs text-gray-500 block mb-1">Status</span>
                           <span
                              className={`px-3 py-1 bg-opacity-20 rounded-full text-xs font-medium inline-block
    ${selectedCompany.isActive === true ? 'text-green-500 bg-green-500' :
                                    selectedCompany.isActive === false ? 'text-red-500 bg-red-500' :
                                       'text-gray-500 bg-gray-500'}`}
                           >
                              {selectedCompany.isActive === true
                                 ? 'Active'
                                 : selectedCompany.isActive === false
                                    ? 'Inactive'
                                    : 'UNKNOWN'}
                           </span>

                        </div>
                     </div>

                     <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Company Information</h3>
                        <div className="bg-dark-tertiary rounded-lg p-4 space-y-3">
                           <div>
                              <span className="text-xs text-gray-500 block">Company Name</span>
                              <p className="text-white font-medium">{selectedCompany.name || 'No Name'}</p>
                           </div>
                           <div>
                              <span className="text-xs text-gray-500 block">Email</span>
                              <p className="text-gray-300 text-sm">{selectedCompany.email || 'No Email'}</p>
                           </div>
                           <div>
                              <span className="text-xs text-gray-500 block">Address</span>
                              <p className="text-gray-300 text-sm">{selectedCompany.address || 'No Address'}</p>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <span className="text-xs text-gray-500 block">Created Date</span>
                                 <p className="text-white text-sm">
                                    {selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleDateString() : 'N/A'}
                                 </p>
                              </div>
                              <div>
                                 <span className="text-xs text-gray-500 block">Last Updated</span>
                                 <p className="text-white text-sm">
                                    {selectedCompany.updatedAt ? new Date(selectedCompany.updatedAt).toLocaleDateString() : 'N/A'}
                                 </p>
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
                     <h2 className="text-xl font-bold text-white">Create New Company</h2>
                     <button onClick={closeCreateModal} className="text-gray-400 hover:text-white transition">
                        <i className="fa-solid fa-times text-xl"></i>
                     </button>
                  </div>

                  <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
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
                           className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                           placeholder="Enter email address"
                        />
                     </div>

                     <div>
                        <label className="text-sm text-gray-400 block mb-2">Password *</label>
                        <input
                           type="password"
                           name="password"
                           value={formData.password}
                           onChange={handleInputChange}
                           required
                           className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"
                           placeholder="Enter password"
                        />
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

                     <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                        <button
                           type="button"
                           onClick={closeCreateModal}
                           className="bg-dark-tertiary hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           className="bg-dark-accent hover:bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2"
                        >
                           <i className="fa-solid fa-plus"></i>
                           <span>Create Company</span>
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