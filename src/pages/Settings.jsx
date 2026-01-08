/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useCompanyStore } from '../store/company.store';
import { useSettingsStore } from '../store/settings.store';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import PageLoader from '../components/loader/PageLoader';

const Settings = () => {
   const { t } = useTranslation();
   const { user, updateProfile, updatePassword, isLoading: authLoading } = useAuthStore();
   const { selectedCompany, getCompanyById, updateCompany, isLoading: companyLoading } = useCompanyStore();
   const { language, theme, setTheme, setLanguage } = useSettingsStore();

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
      address: ''
   });

   const userData = user?.data?.user || user;
   const IsSuperAdmin = userData?.role === 'super_admin';
   const IsCompanyAdmin = userData?.role === 'company_admin';
   const isAdmin = IsSuperAdmin || IsCompanyAdmin;

   const lastInitedUserId = useRef(null);
   const lastInitedCompId = useRef(null);

   useEffect(() => {
      if (userData && lastInitedUserId.current !== userData._id) {
         setProfileData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || ''
         });
         lastInitedUserId.current = userData._id;
      }
   }, [userData]);

   useEffect(() => {
      if (activeTab === 'company' && userData?.company) {
         const companyId = userData.company._id || userData.company;
         getCompanyById(companyId);
      }
   }, [activeTab, userData?.company, getCompanyById]);

   useEffect(() => {
      if (selectedCompany && lastInitedCompId.current !== selectedCompany._id) {
         setCompData({
            name: selectedCompany.name || '',
            email: selectedCompany.email || '',
            phone: selectedCompany.phone || '',
            address: selectedCompany.address || ''
         });
         lastInitedCompId.current = selectedCompany._id;
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
      <div className="flex flex-col h-full bg-white dark:bg-dark-primary transition-colors duration-300">
         {/* Header */}
         <div id="settings-header-section" className="px-8 py-6 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50/40 dark:bg-dark-secondary/40 backdrop-blur-xl">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">{t('settings')}</h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium opacity-80">{t('manage_profile_desc')}</p>
               </div>
            </div>
         </div>

         <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Internal Sidebar */}
            <div id="settings-sidebar" className="w-full md:w-72 bg-gray-50/60 dark:bg-dark-secondary/60 border-r border-gray-200 dark:border-gray-800/50 p-6 overflow-y-auto shrink-0 md:h-full">
               <div className="space-y-2 font-medium">
                  <button
                     onClick={() => setActiveTab('general')}
                     className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 flex items-center space-x-3 border ${activeTab === 'general' ? 'bg-dark-accent/10 text-dark-accent border-dark-accent/30 shadow-lg shadow-red-900/10' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-dark-tertiary/50 dark:hover:text-gray-200 border-transparent'}`}
                  >
                     <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'general' ? 'bg-dark-accent/20' : 'bg-gray-200 dark:bg-gray-800/40'}`}>
                        <i className="fa-solid fa-user-circle text-lg w-5 text-center"></i>
                     </div>
                     <span className="text-sm">{t('general_profile')}</span>
                  </button>
                  <button
                     onClick={() => setActiveTab('security')}
                     className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 flex items-center space-x-3 border ${activeTab === 'security' ? 'bg-dark-accent/10 text-dark-accent border-dark-accent/30 shadow-lg shadow-red-900/10' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-dark-tertiary/50 dark:hover:text-gray-200 border-transparent'}`}
                  >
                     <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'security' ? 'bg-dark-accent/20' : 'bg-gray-200 dark:bg-gray-800/40'}`}>
                        <i className="fa-solid fa-shield-halved text-lg w-5 text-center"></i>
                     </div>
                     <span className="text-sm">{t('security_privacy')}</span>
                  </button>
                  {isAdmin && (
                     <button
                        onClick={() => setActiveTab('company')}
                        className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 flex items-center space-x-3 border ${activeTab === 'company' ? 'bg-dark-accent/10 text-dark-accent border-dark-accent/30 shadow-lg shadow-red-900/10' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-dark-tertiary/50 dark:hover:text-gray-200 border-transparent'}`}
                     >
                        <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'company' ? 'bg-dark-accent/20' : 'bg-gray-200 dark:bg-gray-800/40'}`}>
                           <i className="fa-solid fa-building-user text-lg w-5 text-center"></i>
                        </div>
                        <span className="text-sm">{t('company_profile')}</span>
                     </button>
                  )}
                  <button
                     onClick={() => setActiveTab('appearance')}
                     className={`w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 flex items-center space-x-3 border ${activeTab === 'appearance' ? 'bg-dark-accent/10 text-dark-accent border-dark-accent/30 shadow-lg shadow-red-900/10' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-dark-tertiary/50 dark:hover:text-gray-200 border-transparent'}`}
                  >
                     <div className={`p-1.5 rounded-lg transition-colors ${activeTab === 'appearance' ? 'bg-dark-accent/20' : 'bg-gray-200 dark:bg-gray-800/40'}`}>
                        <i className="fa-solid fa-palette text-lg w-5 text-center"></i>
                     </div>
                     <span className="text-sm">{t('appearance')}</span>
                  </button>
               </div>
            </div>

            {/* Content Area */}
            <div id="settings-content" className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-dark-primary/20">
               {activeTab === 'general' && (
                  <form onSubmit={handleProfileUpdate} className="max-w-4xl space-y-6 animate-fadeIn">
                     <div className="bg-white dark:bg-dark-secondary/40 border border-gray-200 dark:border-gray-800/50 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-md">
                        <div className="flex items-center space-x-5 mb-10">
                           <div className="w-16 h-16 rounded-2xl bg-dark-accent/10 border border-dark-accent/20 flex items-center justify-center text-dark-accent text-3xl shadow-inner">
                              <i className="fa-solid fa-id-card"></i>
                           </div>
                           <div>
                              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('public_profile')}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('update_personal_info')}</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2.5">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('full_name')}</label>
                              <input
                                 type="text"
                                 value={profileData.name}
                                 onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                                 className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                 placeholder="Enter your name"
                              />
                           </div>
                           <div className="space-y-2.5">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('email_address')}</label>
                              <input
                                 type="email"
                                 value={profileData.email}
                                 onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                                 onBlur={e => {
                                    const val = e.target.value;
                                    if (val && !val.includes('@')) {
                                       setProfileData({ ...profileData, email: val.trim() + '@gmail.com' });
                                    }
                                 }}
                                 className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                 placeholder="email@example.com"
                              />
                              <p className="text-[10px] text-gray-500 ml-1 mt-1">
                                 Domain @gmail.com will be added automatically if missing
                              </p>
                           </div>
                           <div className="space-y-2.5">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('phone_number')}</label>
                              <input
                                 type="tel"
                                 value={profileData.phone}
                                 onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                                 className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                 placeholder="+1 (000) 000-0000"
                              />
                           </div>
                        </div>
                        <div className="mt-12 flex justify-end">
                           <button type="submit" className="bg-dark-accent hover:bg-red-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-red-900/30 active:scale-95 flex items-center space-x-2">
                              <i className="fa-solid fa-save"></i>
                              <span>{t('update_profile')}</span>
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'security' && (
                  <form onSubmit={handlePasswordUpdate} className="max-w-4xl space-y-6 animate-fadeIn">
                     <div className="bg-white dark:bg-dark-secondary/40 border border-gray-200 dark:border-gray-800/50 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-md">
                        <div className="flex items-center space-x-5 mb-10">
                           <div className="w-16 h-16 rounded-2xl bg-dark-accent/10 border border-dark-accent/20 flex items-center justify-center text-dark-accent text-3xl shadow-inner">
                              <i className="fa-solid fa-lock"></i>
                           </div>
                           <div>
                              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('security')}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('maintain_account_security')}</p>
                           </div>
                        </div>
                        <div className="space-y-8">
                           <div className="space-y-2.5">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('current_password')}</label>
                              <input
                                 type="password"
                                 value={passwordData.currentPassword}
                                 onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                 className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300"
                              />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2.5">
                                 <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('new_password')}</label>
                                 <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300"
                                 />
                              </div>
                              <div className="space-y-2.5">
                                 <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('confirm_new_password')}</label>
                                 <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300"
                                 />
                              </div>
                           </div>
                        </div>
                        <div className="mt-12 flex justify-end">
                           <button type="submit" className="bg-dark-accent hover:bg-red-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-red-900/30 active:scale-95 flex items-center space-x-2">
                              <i className="fa-solid fa-key"></i>
                              <span>{t('update_password')}</span>
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'company' && isAdmin && (
                  <form onSubmit={handleCompanyUpdate} className="max-w-4xl space-y-6 animate-fadeIn">
                     <div className="bg-white dark:bg-dark-secondary/40 border border-gray-200 dark:border-gray-800/50 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-md">
                        <div className="flex items-center space-x-5 mb-10">
                           <div className="w-16 h-16 rounded-2xl bg-dark-accent/10 border border-dark-accent/20 flex items-center justify-center text-dark-accent text-3xl shadow-inner">
                              <i className="fa-solid fa-building"></i>
                           </div>
                           <div>
                              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('company_profile')}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('update_personal_info')}</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2.5">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('company_name')}</label>
                              <input
                                 type="text"
                                 value={compData.name}
                                 onChange={e => setCompData({ ...compData, name: e.target.value })}
                                 className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300"
                              />
                           </div>
                           <div className="space-y-2.5">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('official_email')}</label>
                              <input
                                 type="email"
                                 value={compData.email}
                                 onChange={e => setCompData({ ...compData, email: e.target.value })}
                                 onBlur={e => {
                                    const val = e.target.value;
                                    if (val && !val.includes('@')) {
                                       setCompData({ ...compData, email: val.trim() + '@gmail.com' });
                                    }
                                 }}
                                 className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300"
                              />
                              <p className="text-[10px] text-gray-500 ml-1 mt-1">
                                 Domain @gmail.com will be added automatically if missing
                              </p>
                           </div>
                           <div className="space-y-2.5">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('contact_phone')}</label>
                              <input
                                 type="tel"
                                 value={compData.phone}
                                 onChange={e => setCompData({ ...compData, phone: e.target.value })}
                                 className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300"
                              />
                           </div>
                           <div className="col-span-1 md:col-span-2 space-y-2.5">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1">{t('main_address')}</label>
                              <textarea
                                 rows="3"
                                 value={compData.address}
                                 onChange={e => setCompData({ ...compData, address: e.target.value })}
                                 className="w-full bg-gray-100 dark:bg-dark-tertiary/40 border border-gray-200 dark:border-gray-700/30 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-dark-accent/50 focus:ring-2 focus:ring-dark-accent/10 transition-all duration-300"
                              ></textarea>
                           </div>
                        </div>
                        <div className="mt-12 flex justify-end">
                           <button type="submit" className="bg-dark-accent hover:bg-red-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-red-900/30 active:scale-95 flex items-center space-x-2">
                              <i className="fa-solid fa-save"></i>
                              <span>{t('update_company')}</span>
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'appearance' && (
                  <div className="max-w-4xl space-y-6 animate-fadeIn">
                     <div className="bg-white dark:bg-dark-secondary/40 border border-gray-200 dark:border-gray-800/50 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-md">
                        <div className="flex items-center space-x-5 mb-10">
                           <div className="w-16 h-16 rounded-2xl bg-dark-accent/10 border border-dark-accent/20 flex items-center justify-center text-dark-accent text-3xl shadow-inner">
                              <i className="fa-solid fa-eye"></i>
                           </div>
                           <div>
                              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('appearance')}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('customize_interface')}</p>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-6 bg-gray-100 dark:bg-dark-tertiary/30 rounded-2xl border border-gray-200 dark:border-gray-700/30 hover:border-dark-accent/30 transition-all duration-300 group">
                              <div className="flex items-center space-x-5">
                                 <div className="w-12 h-12 rounded-xl bg-gray-600/10 flex items-center justify-center text-gray-400 dark:text-gray-400 group-hover:text-dark-accent transition-colors">
                                    <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-xl`}></i>
                                 </div>
                                 <div>
                                    <h4 className="text-gray-900 dark:text-white font-bold tracking-tight">{t('dark_mode')}</h4>
                                    <p className="text-gray-500 dark:text-gray-500 text-xs font-medium">{t('system_defaults_dark')}</p>
                                 </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input
                                    type="checkbox"
                                    checked={theme === 'dark'}
                                    onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
                                    className="sr-only peer"
                                 />
                                 <div className="w-14 h-7 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-dark-accent shadow-lg shadow-red-900/20"></div>
                              </label>
                           </div>

                           <div className="flex items-center justify-between p-6 bg-gray-100 dark:bg-dark-tertiary/30 rounded-2xl border border-gray-200 dark:border-gray-700/30 hover:border-dark-accent/30 transition-all duration-300 group">
                              <div className="flex items-center space-x-5">
                                 <div className="w-12 h-12 rounded-xl bg-gray-600/10 flex items-center justify-center text-gray-400 dark:text-gray-400 group-hover:text-dark-accent transition-colors">
                                    <i className="fa-solid fa-earth-americas text-xl"></i>
                                 </div>
                                 <div>
                                    <h4 className="text-gray-900 dark:text-white font-bold tracking-tight">{t('preferred_language')}</h4>
                                    <p className="text-gray-500 dark:text-gray-500 text-xs font-medium">{t('set_preferred_language')}</p>
                                 </div>
                              </div>
                              <select
                                 value={language}
                                 onChange={(e) => setLanguage(e.target.value)}
                                 className="bg-white dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700/50 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-sm font-bold focus:outline-none focus:border-dark-accent transition-all cursor-pointer shadow-lg outline-none"
                              >
                                 <option value="en">English</option>
                                 <option value="ru">Русский</option>
                                 <option value="uz">O'zbekcha</option>
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
