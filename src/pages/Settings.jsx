import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useCompanyStore } from '../store/company.store';
import { toast } from 'react-toastify';
import PageLoader from '../components/loader/PageLoader';

const Settings = () => {
   const { user, updateProfile, updatePassword, isLoading: authLoading } = useAuthStore();
   const { selectedCompany, getCompanyById, updateCompany, isLoading: companyLoading } = useCompanyStore();

   const [activeTab, setActiveTab] = useState('general');
   const [profileData, setProfileData] = useState({
      name: '',
      email: '',
      phone: ''
   });
   const [passwordData, setPasswordData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
   });
   const [compData, setCompData] = useState({
      name: '',
      email: '',
      phone: '',
      website: '',
      address: ''
   });

   const userData = user?.data?.user || user;
   const IsSuperAdmin = userData?.role === 'super_admin';
   const IsCompanyAdmin = userData?.role === 'company_admin';
   const isAdmin = IsSuperAdmin || IsCompanyAdmin;

   useEffect(() => {
      if (userData) {
         setProfileData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || ''
         });
      }
   }, [userData]);

   useEffect(() => {
      if (activeTab === 'company' && userData?.company) {
         const companyId = userData.company._id || userData.company;
         getCompanyById(companyId);
      }
   }, [activeTab, userData?.company, getCompanyById]);

   useEffect(() => {
      if (selectedCompany) {
         setCompData({
            name: selectedCompany.name || '',
            email: selectedCompany.email || '',
            phone: selectedCompany.phone || '',
            website: selectedCompany.website || '',
            address: selectedCompany.address || ''
         });
      }
   }, [selectedCompany]);

   const handleProfileUpdate = async (e) => {
      e.preventDefault();
      try {
         await updateProfile(profileData);
         toast.success('Profile updated successfully');
      } catch (err) {
         toast.error(err.response?.data?.message || 'Failed to update profile');
      }
   };

   const handlePasswordUpdate = async (e) => {
      e.preventDefault();
      if (passwordData.newPassword !== passwordData.confirmPassword) {
         return toast.error('Passwords do not match');
      }
      try {
         await updatePassword({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
         });
         toast.success('Password updated successfully');
         setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } catch (err) {
         toast.error(err.response?.data?.message || 'Failed to update password');
      }
   };

   const handleCompanyUpdate = async (e) => {
      e.preventDefault();
      try {
         await updateCompany(selectedCompany._id, compData);
         toast.success('Company info updated successfully');
      } catch (err) {
         toast.error(err.response?.data?.message || 'Failed to update company');
      }
   };

   if (authLoading || (activeTab === 'company' && companyLoading)) return <PageLoader />;

   return (
      <div className="flex flex-col h-full bg-dark-primary">
         {/* Header */}
         <div id="settings-header-section" className="px-8 py-6 border-b border-gray-800 shrink-0 bg-dark-secondary/50 backdrop-blur-md">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
                  <p className="text-gray-400 text-sm">Manage your profile and system preferences</p>
               </div>
            </div>
         </div>

         <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Internal Sidebar */}
            <div id="settings-sidebar" className="w-full md:w-72 bg-dark-secondary border-r border-gray-800 p-6 overflow-y-auto shrink-0 md:h-full">
               <div className="space-y-1.5 font-medium">
                  <button
                     onClick={() => setActiveTab('general')}
                     className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center space-x-3 ${activeTab === 'general' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-900/10' : 'text-gray-400 hover:bg-dark-tertiary hover:text-gray-200'}`}
                  >
                     <i className="fa-solid fa-user-circle text-lg w-6"></i>
                     <span>General Profile</span>
                  </button>
                  <button
                     onClick={() => setActiveTab('security')}
                     className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center space-x-3 ${activeTab === 'security' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-900/10' : 'text-gray-400 hover:bg-dark-tertiary hover:text-gray-200'}`}
                  >
                     <i className="fa-solid fa-shield-halved text-lg w-6"></i>
                     <span>Security & Privacy</span>
                  </button>
                  {isAdmin && (
                     <button
                        onClick={() => setActiveTab('company')}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center space-x-3 ${activeTab === 'company' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-900/10' : 'text-gray-400 hover:bg-dark-tertiary hover:text-gray-200'}`}
                     >
                        <i className="fa-solid fa-building-user text-lg w-6"></i>
                        <span>Company Profile</span>
                     </button>
                  )}
                  <button
                     onClick={() => setActiveTab('appearance')}
                     className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center space-x-3 ${activeTab === 'appearance' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-900/10' : 'text-gray-400 hover:bg-dark-tertiary hover:text-gray-200'}`}
                  >
                     <i className="fa-solid fa-palette text-lg w-6"></i>
                     <span>Appearance</span>
                  </button>
               </div>
            </div>

            {/* Content Area */}
            <div id="settings-content" className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-dark-primary/30">
               {activeTab === 'general' && (
                  <form onSubmit={handleProfileUpdate} className="max-w-4xl space-y-6 animate-fade-in">
                     <div className="bg-dark-secondary/50 border border-gray-800 rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center space-x-4 mb-8">
                           <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-2xl">
                              <i className="fa-solid fa-id-card"></i>
                           </div>
                           <div>
                              <h3 className="text-xl font-bold text-white">Public Profile</h3>
                              <p className="text-gray-400 text-sm">Update your personal information</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Full Name</label>
                              <input
                                 type="text"
                                 value={profileData.name}
                                 onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                                 placeholder="Enter your name"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Email Address</label>
                              <input
                                 type="email"
                                 value={profileData.email}
                                 onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                                 placeholder="email@example.com"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Phone Number</label>
                              <input
                                 type="tel"
                                 value={profileData.phone}
                                 onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                                 placeholder="+1 (000) 000-0000"
                              />
                           </div>
                        </div>
                        <div className="mt-10 flex justify-end">
                           <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/40 active:scale-95">
                              <i className="fa-solid fa-save mr-2"></i> Update Profile
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'security' && (
                  <form onSubmit={handlePasswordUpdate} className="max-w-4xl space-y-6 animate-fade-in">
                     <div className="bg-dark-secondary/50 border border-gray-800 rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center space-x-4 mb-8">
                           <div className="w-16 h-16 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl">
                              <i className="fa-solid fa-lock"></i>
                           </div>
                           <div>
                              <h3 className="text-xl font-bold text-white">Password Settings</h3>
                              <p className="text-gray-400 text-sm">Maintain your account security</p>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Current Password</label>
                              <input
                                 type="password"
                                 value={passwordData.currentPassword}
                                 onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                              />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-sm font-semibold text-gray-400 ml-1">New Password</label>
                                 <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-sm font-semibold text-gray-400 ml-1">Confirm New Password</label>
                                 <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                                 />
                              </div>
                           </div>
                        </div>
                        <div className="mt-10 flex justify-end">
                           <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/40 active:scale-95">
                              <i className="fa-solid fa-key mr-2"></i> Update Password
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'company' && isAdmin && (
                  <form onSubmit={handleCompanyUpdate} className="max-w-4xl space-y-6 animate-fade-in">
                     <div className="bg-dark-secondary/50 border border-gray-800 rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center space-x-4 mb-8">
                           <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl">
                              <i className="fa-solid fa-building"></i>
                           </div>
                           <div>
                              <h3 className="text-xl font-bold text-white">Company Information</h3>
                              <p className="text-gray-400 text-sm">Admin only company details and branding</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Company Name</label>
                              <input
                                 type="text"
                                 value={compData.name}
                                 onChange={e => setCompData({ ...compData, name: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Official Email</label>
                              <input
                                 type="email"
                                 value={compData.email}
                                 onChange={e => setCompData({ ...compData, email: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Contact Phone</label>
                              <input
                                 type="tel"
                                 value={compData.phone}
                                 onChange={e => setCompData({ ...compData, phone: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Website URL</label>
                              <input
                                 type="url"
                                 value={compData.website}
                                 onChange={e => setCompData({ ...compData, website: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                              />
                           </div>
                           <div className="col-span-1 md:col-span-2 space-y-2">
                              <label className="text-sm font-semibold text-gray-400 ml-1">Main Address</label>
                              <textarea
                                 rows="3"
                                 value={compData.address}
                                 onChange={e => setCompData({ ...compData, address: e.target.value })}
                                 className="w-full bg-dark-tertiary border border-gray-700/50 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                              ></textarea>
                           </div>
                        </div>
                        <div className="mt-10 flex justify-end">
                           <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/40 active:scale-95">
                              <i className="fa-solid fa-save mr-2"></i> Save Company Data
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'appearance' && (
                  <div className="max-w-4xl space-y-6 animate-fade-in">
                     <div className="bg-dark-secondary/50 border border-gray-800 rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center space-x-4 mb-8">
                           <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-2xl">
                              <i className="fa-solid fa-eye"></i>
                           </div>
                           <div>
                              <h3 className="text-xl font-bold text-white">Visual Preferences</h3>
                              <p className="text-gray-400 text-sm">Customize how the application looks for you</p>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <div className="flex items-center justify-between p-4 bg-dark-tertiary/40 rounded-xl border border-gray-700/50 hover:bg-dark-tertiary/60 transition-colors">
                              <div className="flex items-center space-x-4">
                                 <div className="w-10 h-10 rounded-lg bg-gray-600/20 flex items-center justify-center text-gray-400">
                                    <i className="fa-solid fa-moon"></i>
                                 </div>
                                 <div>
                                    <h4 className="text-white font-medium">Dark Mode</h4>
                                    <p className="text-gray-400 text-xs">Switch between dark and light themes</p>
                                 </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input type="checkbox" defaultChecked className="sr-only peer" />
                                 <div className="w-12 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-md"></div>
                              </label>
                           </div>

                           <div className="flex items-center justify-between p-4 bg-dark-tertiary/40 rounded-xl border border-gray-700/50 hover:bg-dark-tertiary/60 transition-colors">
                              <div className="flex items-center space-x-4">
                                 <div className="w-10 h-10 rounded-lg bg-gray-600/20 flex items-center justify-center text-gray-400">
                                    <i className="fa-solid fa-earth-americas"></i>
                                 </div>
                                 <div>
                                    <h4 className="text-white font-medium">Interface Language</h4>
                                    <p className="text-gray-400 text-xs">Set your preferred display language</p>
                                 </div>
                              </div>
                              <select className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer">
                                 <option>English</option>
                                 <option>Russian</option>
                                 <option>Uzbek</option>
                              </select>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default Settings;
