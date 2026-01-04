import React, { useState } from 'react';
import Plot from 'react-plotly.js';

const Payments = () => {
   const [projectAmount, setProjectAmount] = useState(10000);

   const distributionData = [{
      type: 'pie',
      labels: ['Team Members (70%)', 'Main Admin (10%)', 'Admin (10%)', 'Company (10%)'],
      values: [7000, 1000, 1000, 1000],
      marker: {
         colors: ['#10B981', '#FF0000', '#3B82F6', '#F59E0B']
      },
      textinfo: 'label+value',
      textfont: { color: '#FFFFFF', size: 10 },
      hovertemplate: '%{label}: $%{value}<extra></extra>'
   }];

   const distributionLayout = {
      autosize: true,
      margin: { t: 0, r: 0, b: 0, l: 0 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   const revenueData = [{
      type: 'scatter',
      mode: 'lines',
      x: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
      y: [32000, 38000, 35000, 42000, 45000, 48250],
      line: { color: '#10B981', width: 3 },
      fill: 'tozeroy',
      fillcolor: 'rgba(16, 185, 129, 0.1)'
   }];

   const revenueLayout = {
      autosize: true,
      xaxis: { gridcolor: '#2A2A2A', color: '#9CA3AF' },
      yaxis: {
         gridcolor: '#2A2A2A',
         color: '#9CA3AF',
         tickformat: '$,.0f'
      },
      margin: { t: 20, r: 20, b: 40, l: 60 },
      plot_bgcolor: '#1A1A1A',
      paper_bgcolor: '#1A1A1A',
      showlegend: false
   };

   return (
      <div className="p-8 space-y-8">
         <div id="payments-header-section">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Payment Management</h1>
                  <p className="text-gray-400">Confirm payments and manage automatic salary distribution</p>
               </div>
               <div className="flex flex-wrap items-center gap-3">
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-filter"></i>
                     <span>Filter</span>
                  </button>
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-download"></i>
                     <span>Export Report</span>
                  </button>
                  <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                     <i className="fa-solid fa-plus"></i>
                     <span>New Payment</span>
                  </button>
               </div>
            </div>
         </div>

         <div id="payments-stats-section" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-green-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-dollar-sign text-green-500 text-xl"></i>
                  </div>
                  <span className="text-xs text-green-500 font-medium">+12.5%</span>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Total Revenue</h3>
               <p className="text-2xl font-bold text-white">$245,680</p>
               <p className="text-xs text-gray-500 mt-1">All time earnings</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-yellow-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-clock text-yellow-500 text-xl"></i>
                  </div>
                  <span className="text-xs text-yellow-500 font-medium">8 pending</span>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Pending Payments</h3>
               <p className="text-2xl font-bold text-white">$32,450</p>
               <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-blue-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-calendar text-blue-500 text-xl"></i>
                  </div>
                  <span className="text-xs text-blue-500 font-medium">+8.3%</span>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">This Month</h3>
               <p className="text-2xl font-bold text-white">$48,250</p>
               <p className="text-xs text-gray-500 mt-1">January 2024</p>
            </div>
            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-5 hover:border-purple-500 transition">
               <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                     <i className="fa-solid fa-users text-purple-500 text-xl"></i>
                  </div>
                  <span className="text-xs text-purple-500 font-medium">24 members</span>
               </div>
               <h3 className="text-gray-400 text-xs mb-1">Team Payouts</h3>
               <p className="text-2xl font-bold text-white">$171,360</p>
               <p className="text-xs text-gray-500 mt-1">70% of revenue</p>
            </div>
         </div>

         <div id="payment-distribution-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">Payment Distribution Calculator</h3>
                     <p className="text-sm text-gray-400">Automatic salary split based on project revenue</p>
                  </div>
                  <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                     <i className="fa-solid fa-calculator mr-2"></i>Calculate
                  </button>
               </div>

               <div className="bg-dark-tertiary rounded-lg p-5 mb-6 border border-gray-700">
                  <label className="text-sm text-gray-400 mb-2 block">Project Total Amount ($)</label>
                  <input type="number" value={projectAmount} onChange={(e) => setProjectAmount(e.target.value)} className="w-full bg-dark-secondary border border-gray-700 rounded-lg px-4 py-3 text-white text-xl font-semibold focus:outline-none focus:border-dark-accent" id="project-amount" />
               </div>

               <div className="space-y-4">
                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-dark-accent transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-dark-accent bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-user-shield text-dark-accent"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">Main Admin</p>
                              <p className="text-xs text-gray-400">10% of total</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * 0.10).toLocaleString()}</p>
                           <p className="text-xs text-dark-accent">10%</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-user-tie text-blue-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">Admin</p>
                              <p className="text-xs text-gray-400">10% of total</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * 0.10).toLocaleString()}</p>
                           <p className="text-xs text-blue-500">10%</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-yellow-500 transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-building text-yellow-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">Company</p>
                              <p className="text-xs text-gray-400">10% of total</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * 0.10).toLocaleString()}</p>
                           <p className="text-xs text-yellow-500">10%</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700 hover:border-green-500 transition">
                     <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                              <i className="fa-solid fa-users text-green-500"></i>
                           </div>
                           <div>
                              <p className="text-white font-medium">Team Members</p>
                              <p className="text-xs text-gray-400">70% divided by contribution</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xl font-bold text-white">${(projectAmount * 0.70).toLocaleString()}</p>
                           <p className="text-xs text-green-500">70%</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Distribution Chart</h3>
                  <p className="text-sm text-gray-400">Visual breakdown</p>
               </div>
               <div className="w-full h-[350px]">
                  <Plot
                     data={distributionData}
                     layout={distributionLayout}
                     useResizeHandler={true}
                     style={{ width: "100%", height: "100%" }}
                     config={{ displayModeBar: false }}
                  />
               </div>
            </div>
         </div>

         <div id="pending-payments-section" className="bg-dark-secondary border border-gray-800 rounded-xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
               <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Pending Payment Confirmations</h3>
                  <p className="text-sm text-gray-400">Review and approve incoming payments</p>
               </div>
               <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition flex-1 sm:flex-none">
                     <i className="fa-solid fa-sort"></i>
                  </button>
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition flex-1 sm:flex-none">
                     <i className="fa-solid fa-filter"></i>
                  </button>
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full min-w-[800px]">
                  <thead>
                     <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Project</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Client</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Method</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Action</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr className="border-b border-gray-800 hover:bg-dark-tertiary transition">
                        <td className="py-4 px-4"><p className="text-sm text-white">Jan 15, 2024</p><p className="text-xs text-gray-400">10:30 AM</p></td>
                        <td className="py-4 px-4"><p className="text-sm text-white font-medium">E-commerce Platform</p><p className="text-xs text-gray-400">#PRJ-2024-001</p></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg" alt="Client" className="w-8 h-8 rounded-full" /><div><p className="text-sm text-white">TechCorp Inc.</p><p className="text-xs text-gray-400">Sarah Miller</p></div></div></td>
                        <td className="py-4 px-4"><p className="text-sm text-white font-semibold">$12,500</p></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><i className="fa-brands fa-cc-visa text-blue-500"></i><span className="text-sm text-gray-300">Credit Card</span></div></td>
                        <td className="py-4 px-4"><span className="px-2 py-1 bg-yellow-500 bg-opacity-20 text-yellow-500 rounded text-xs font-medium">Pending</span></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"><i className="fa-solid fa-check mr-1"></i>Confirm</button><button className="bg-dark-tertiary hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium transition"><i className="fa-solid fa-eye"></i></button></div></td>
                     </tr>
                     <tr className="border-b border-gray-800 hover:bg-dark-tertiary transition">
                        <td className="py-4 px-4"><p className="text-sm text-white">Jan 14, 2024</p><p className="text-xs text-gray-400">3:45 PM</p></td>
                        <td className="py-4 px-4"><p className="text-sm text-white font-medium">Mobile App Development</p><p className="text-xs text-gray-400">#PRJ-2024-002</p></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg" alt="Client" className="w-8 h-8 rounded-full" /><div><p className="text-sm text-white">StartupXYZ</p><p className="text-xs text-gray-400">John Davis</p></div></div></td>
                        <td className="py-4 px-4"><p className="text-sm text-white font-semibold">$8,750</p></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><i className="fa-brands fa-paypal text-blue-600"></i><span className="text-sm text-gray-300">PayPal</span></div></td>
                        <td className="py-4 px-4"><span className="px-2 py-1 bg-yellow-500 bg-opacity-20 text-yellow-500 rounded text-xs font-medium">Pending</span></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"><i className="fa-solid fa-check mr-1"></i>Confirm</button><button className="bg-dark-tertiary hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium transition"><i className="fa-solid fa-eye"></i></button></div></td>
                     </tr>
                     <tr className="border-b border-gray-800 hover:bg-dark-tertiary transition">
                        <td className="py-4 px-4"><p className="text-sm text-white">Jan 14, 2024</p><p className="text-xs text-gray-400">11:20 AM</p></td>
                        <td className="py-4 px-4"><p className="text-sm text-white font-medium">Website Redesign</p><p className="text-xs text-gray-400">#PRJ-2024-003</p></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg" alt="Client" className="w-8 h-8 rounded-full" /><div><p className="text-sm text-white">Digital Agency</p><p className="text-xs text-gray-400">Emma Wilson</p></div></div></td>
                        <td className="py-4 px-4"><p className="text-sm text-white font-semibold">$6,200</p></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><i className="fa-solid fa-building-columns text-green-500"></i><span className="text-sm text-gray-300">Bank Transfer</span></div></td>
                        <td className="py-4 px-4"><span className="px-2 py-1 bg-yellow-500 bg-opacity-20 text-yellow-500 rounded text-xs font-medium">Pending</span></td>
                        <td className="py-4 px-4"><div className="flex items-center space-x-2"><button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition"><i className="fa-solid fa-check mr-1"></i>Confirm</button><button className="bg-dark-tertiary hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium transition"><i className="fa-solid fa-eye"></i></button></div></td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>

         <div id="payment-history-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="flex items-center justify-between mb-6">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">Payment History</h3>
                     <p className="text-sm text-gray-400">Recent confirmed transactions</p>
                  </div>
                  <button className="text-dark-accent hover:text-red-600 text-sm font-medium transition">View All →</button>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-dark-tertiary rounded-lg border border-gray-700 hover:border-green-500 transition">
                     <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                           <i className="fa-solid fa-check text-green-500"></i>
                        </div>
                        <div>
                           <p className="text-sm text-white font-medium">E-commerce Platform</p>
                           <p className="text-xs text-gray-400">Confirmed on Jan 13, 2024</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm text-white font-semibold">$15,000</p>
                        <p className="text-xs text-green-500">Distributed</p>
                     </div>
                  </div>
                  {/* More Items */}
                  <div className="flex items-center justify-between p-4 bg-dark-tertiary rounded-lg border border-gray-700 hover:border-green-500 transition">
                     <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                           <i className="fa-solid fa-check text-green-500"></i>
                        </div>
                        <div>
                           <p className="text-sm text-white font-medium">CRM System Integration</p>
                           <p className="text-xs text-gray-400">Confirmed on Jan 12, 2024</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm text-white font-semibold">$9,500</p>
                        <p className="text-xs text-green-500">Distributed</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
               <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">Revenue Trends</h3>
                  <p className="text-sm text-gray-400">Last 6 months</p>
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

               <div className="mt-6 pt-6 border-t border-gray-800">
                  <h4 className="text-sm font-semibold text-white mb-4">Quick Stats</h4>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Avg. Project Value</span>
                        <span className="text-sm text-white font-semibold">$10,236</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Total Projects</span>
                        <span className="text-sm text-white font-semibold">24</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Success Rate</span>
                        <span className="text-sm text-green-500 font-semibold">98.5%</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Payments;
