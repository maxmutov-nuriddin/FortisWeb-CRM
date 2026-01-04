import React from 'react';

const Settings = () => {
   return (
      <div className="flex flex-col h-full">
         <div id="settings-header-section" className="px-8 py-6 border-b border-gray-800 shrink-0">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                  <p className="text-gray-400">Manage system configurations and preferences</p>
               </div>
               <div className="flex items-center space-x-3">
                  <button className="bg-dark-tertiary hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2 border border-gray-700">
                     <i className="fa-solid fa-download"></i>
                     <span>Export Settings</span>
                  </button>
                  <button className="bg-dark-accent hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                     <i className="fa-solid fa-save"></i>
                     <span>Save Changes</span>
                  </button>
               </div>
            </div>
         </div>

         <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            <div id="settings-sidebar" className="w-full md:w-80 bg-dark-secondary border-r border-gray-800 p-6 overflow-y-auto shrink-0 md:h-full max-h-[200px] md:max-h-full">
               <div className="space-y-2">
                  <button className="w-full text-left px-4 py-3 bg-dark-accent text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-user-cog"></i>
                     <span>General Settings</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-shield-alt"></i>
                     <span>Security & Privacy</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-bell"></i>
                     <span>Notifications</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-brands fa-telegram"></i>
                     <span>Bot Integration</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-credit-card"></i>
                     <span>Payment Settings</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-users-cog"></i>
                     <span>Team Management</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-database"></i>
                     <span>Backup & Recovery</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-chart-bar"></i>
                     <span>Analytics</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-globe"></i>
                     <span>API & Integrations</span>
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-dark-tertiary text-gray-400 hover:text-white rounded-lg font-medium transition flex items-center space-x-3">
                     <i className="fa-solid fa-paint-brush"></i>
                     <span>Appearance</span>
                  </button>
               </div>
            </div>

            <div id="settings-content" className="flex-1 p-4 md:p-8 overflow-y-auto">
               <div id="general-settings-section" className="space-y-8">
                  <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
                     <div className="mb-6">
                        <h3 className="text-xl font-semibold text-white mb-2">Company Information</h3>
                        <p className="text-gray-400 text-sm">Update your company details and branding</p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                           <input type="text" defaultValue="FortisWeb" className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-300 mb-2">Company Email</label>
                           <input type="email" defaultValue="admin@fortisweb.com" className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                           <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                           <input type="url" defaultValue="https://fortisweb.com" className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent" />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                           <label className="block text-sm font-medium text-gray-300 mb-2">Company Address</label>
                           <textarea rows="3" defaultValue="123 Tech Street, Silicon Valley, CA 94043" className="w-full bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent"></textarea>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
                     <div className="mb-6">
                        <h3 className="text-xl font-semibold text-white mb-2">System Preferences</h3>
                        <p className="text-gray-400 text-sm">Configure general system settings</p>
                     </div>
                     <div className="space-y-6">
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="text-white font-medium">Default Language</h4>
                              <p className="text-gray-400 text-sm">Set the default language for the system</p>
                           </div>
                           <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent">
                              <option>English (US)</option>
                              <option>English (UK)</option>
                              <option>Spanish</option>
                              <option>French</option>
                           </select>
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="text-white font-medium">Timezone</h4>
                              <p className="text-gray-400 text-sm">Your current timezone setting</p>
                           </div>
                           <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent">
                              <option>UTC-8 (Pacific Time)</option>
                              <option>UTC-5 (Eastern Time)</option>
                              <option>UTC+0 (GMT)</option>
                              <option>UTC+1 (CET)</option>
                           </select>
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="text-white font-medium">Date Format</h4>
                              <p className="text-gray-400 text-sm">How dates are displayed</p>
                           </div>
                           <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-dark-accent">
                              <option>MM/DD/YYYY</option>
                              <option>DD/MM/YYYY</option>
                              <option>YYYY-MM-DD</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
                     <div className="mb-6">
                        <h3 className="text-xl font-semibold text-white mb-2">Role Permissions</h3>
                        <p className="text-gray-400 text-sm">Configure default permissions for each role</p>
                     </div>
                     <div className="space-y-4">
                        <div className="bg-dark-tertiary rounded-lg p-4">
                           <div className="flex items-center justify-between mb-3">
                              <h4 className="text-white font-medium">Main Admin</h4>
                              <span className="px-2 py-1 bg-dark-accent bg-opacity-20 text-dark-accent rounded text-xs">Full Access</span>
                           </div>
                           <div className="grid grid-cols-4 gap-3 text-xs">
                              <div className="flex items-center space-x-2"><i className="fa-solid fa-check text-green-500"></i><span className="text-gray-300">All Modules</span></div>
                              <div className="flex items-center space-x-2"><i className="fa-solid fa-check text-green-500"></i><span className="text-gray-300">User Management</span></div>
                              <div className="flex items-center space-x-2"><i className="fa-solid fa-check text-green-500"></i><span className="text-gray-300">System Settings</span></div>
                              <div className="flex items-center space-x-2"><i className="fa-solid fa-check text-green-500"></i><span className="text-gray-300">Financial Access</span></div>
                           </div>
                        </div>
                        {/* Other roles... */}
                     </div>
                  </div>

                  <div className="bg-dark-secondary border border-gray-800 rounded-xl p-6">
                     <div className="mb-6">
                        <h3 className="text-xl font-semibold text-white mb-2">System Features</h3>
                        <p className="text-gray-400 text-sm">Enable or disable system features</p>
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="text-white font-medium">Auto Backup</h4>
                              <p className="text-gray-400 text-sm">Automatically backup system data daily</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" defaultChecked className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-dark-accent"></div>
                           </label>
                        </div>
                        <div className="flex items-center justify-between">
                           <div>
                              <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                              <p className="text-gray-400 text-sm">Require 2FA for all admin accounts</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" defaultChecked className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-dark-accent"></div>
                           </label>
                        </div>
                     </div>
                  </div>

               </div>
            </div>
         </div>
      </div>
   );
};

export default Settings;
