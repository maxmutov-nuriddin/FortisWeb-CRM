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
   const { user, updateProfile, updatePassword, getMe, isLoading: authLoading } = useAuthStore();
   const { selectedCompany, getCompanyById, updateCompany, isLoading: companyLoading } = useCompanyStore();
   const { language, theme, setTheme, setLanguage } = useSettingsStore();

   const [activeTab, setActiveTab] = useState('general');
   const [profileData, setProfileData] = useState({
      name: '',
      phone: '',
      avatar: null,
      preview: null
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
         let avatarPreview = null;
         if (userData.avatar) {
            if (userData.avatar.startsWith('http') || userData.avatar.startsWith('data:')) {
               avatarPreview = userData.avatar;
            } else {
               avatarPreview = `http://localhost:5000${userData.avatar}`;
            }
            if (avatarPreview && !avatarPreview.startsWith('data:')) {
               avatarPreview += `?t=${new Date().getTime()}`;
            }
         }

         setProfileData({
            name: userData.name || '',
            phone: userData.phone || '',
            preview: avatarPreview
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

   const compressImage = (file) => {
      return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
               const canvas = document.createElement('canvas');
               const ctx = canvas.getContext('2d');

               const MAX_WIDTH = 300;
               const MAX_HEIGHT = 300;
               let width = img.width;
               let height = img.height;

               if (width > height) {
                  if (width > MAX_WIDTH) {
                     height *= MAX_WIDTH / width;
                     width = MAX_WIDTH;
                  }
               } else {
                  if (height > MAX_HEIGHT) {
                     width *= MAX_HEIGHT / height;
                     height = MAX_HEIGHT;
                  }
               }

               canvas.width = width;
               canvas.height = height;
               ctx.drawImage(img, 0, 0, width, height);

               const base64 = canvas.toDataURL('image/jpeg', 0.7);
               resolve(base64);
            };
            img.onerror = (error) => reject(error);
         };
         reader.onerror = (error) => reject(error);
      });
   };

   const handleProfileUpdate = async (e) => {
      e.preventDefault();
      try {
         const updatePayload = {
            name: profileData.name,
            phone: profileData.phone
         };

         if (profileData.avatar) {
            const base64Avatar = await compressImage(profileData.avatar);
            updatePayload.avatar = base64Avatar;
         }

         await updateProfile(updatePayload);
         await getMe();
         toast.success('Profile updated successfully');
      } catch (err) {
         console.error('Profile Update Error:', err);
         const errorMsg = err.response?.data?.message || err.message || 'Failed to update profile';
         toast.error(`Error: ${errorMsg}`);
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
      <div className="flex flex-col h-full bg-gray-50/50 dark:bg-black transition-colors duration-300">
         {/* Header */}
         <div className="px-6 lg:px-10 py-6 md:py-8 border-b border-gray-100 dark:border-zinc-800 shrink-0 bg-white/60 dark:bg-black/60 backdrop-blur-xl sticky top-0 z-40">
            <div>
               <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t('settings')}</h1>
               <p className="text-gray-500 dark:text-gray-400 font-medium">{t('manage_profile_desc')}</p>
            </div>
         </div>

         <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Internal Sidebar */}
            <div className="w-full md:w-80 p-6 overflow-y-auto shrink-0 md:h-full border-r border-gray-100 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40">
               <nav className="space-y-2">
                  <button
                     onClick={() => setActiveTab('general')}
                     className={`w-full text-left px-4 py-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 border ${activeTab === 'general' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-700 shadow-lg shadow-gray-200/50 dark:shadow-none' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800/50 border-transparent'}`}
                  >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'general' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400'}`}>
                        <i className="fa-solid fa-user-circle text-lg"></i>
                     </div>
                     <span className="text-sm font-bold">{t('general_profile')}</span>
                  </button>
                  <button
                     onClick={() => setActiveTab('security')}
                     className={`w-full text-left px-4 py-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 border ${activeTab === 'security' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-700 shadow-lg shadow-gray-200/50 dark:shadow-none' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800/50 border-transparent'}`}
                  >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'security' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400'}`}>
                        <i className="fa-solid fa-shield-halved text-lg"></i>
                     </div>
                     <span className="text-sm font-bold">{t('security_privacy')}</span>
                  </button>
                  {isAdmin && (
                     <button
                        onClick={() => setActiveTab('company')}
                        className={`w-full text-left px-4 py-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 border ${activeTab === 'company' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-700 shadow-lg shadow-gray-200/50 dark:shadow-none' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800/50 border-transparent'}`}
                     >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'company' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400'}`}>
                           <i className="fa-solid fa-building-user text-lg"></i>
                        </div>
                        <span className="text-sm font-bold">{t('company_profile')}</span>
                     </button>
                  )}
                  <button
                     onClick={() => setActiveTab('appearance')}
                     className={`w-full text-left px-4 py-4 rounded-2xl transition-all duration-300 flex items-center space-x-4 border ${activeTab === 'appearance' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-700 shadow-lg shadow-gray-200/50 dark:shadow-none' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800/50 border-transparent'}`}
                  >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeTab === 'appearance' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400'}`}>
                        <i className="fa-solid fa-palette text-lg"></i>
                     </div>
                     <span className="text-sm font-bold">{t('appearance')}</span>
                  </button>
               </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
               {activeTab === 'general' && (
                  <form onSubmit={handleProfileUpdate} className="max-w-3xl mx-auto space-y-6">
                     <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center space-x-5 mb-8 pb-8 border-b border-gray-100 dark:border-zinc-800">
                           <div className="w-16 h-16 rounded-2xl bg-red-600/10 flex items-center justify-center text-red-600 dark:text-red-500 text-2xl shadow-sm">
                              <i className="fa-solid fa-id-card"></i>
                           </div>
                           <div>
                              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('public_profile')}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('update_personal_info')}</p>
                           </div>
                        </div>

                        {/* Avatar Upload Section */}
                        <div className="flex flex-col items-center mb-8">
                           <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload').click()}>
                              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 dark:border-zinc-800 shadow-xl">
                                 {profileData.preview ? (
                                    <img src={profileData.preview} alt="Profile" className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-300 dark:text-zinc-600">
                                       <i className="fa-solid fa-user text-4xl"></i>
                                    </div>
                                 )}
                              </div>
                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                                 <i className="fa-solid fa-camera text-white text-2xl"></i>
                              </div>
                              <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={(e) => {
                                 const file = e.target.files[0];
                                 if (file) {
                                    setProfileData({ ...profileData, avatar: file, preview: URL.createObjectURL(file) });
                                 }
                              }} />
                           </div>
                           <p className="mt-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Click to update photo</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('full_name')}</label>
                              <input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-medium" placeholder="Enter your name" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('phone_number')}</label>
                              <input type="tel" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-medium" placeholder="+1 (000) 000-0000" />
                           </div>
                        </div>
                        <div className="mt-10 flex justify-end">
                           <button type="submit" className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5 flex items-center gap-2">
                              <i className="fa-solid fa-check"></i>
                              <span>{t('update_profile')}</span>
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'security' && (
                  <form onSubmit={handlePasswordUpdate} className="max-w-3xl mx-auto space-y-6">
                     <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center space-x-5 mb-8 pb-8 border-b border-gray-100 dark:border-zinc-800">
                           <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-500 text-2xl shadow-sm">
                              <i className="fa-solid fa-lock"></i>
                           </div>
                           <div>
                              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('security')}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('maintain_account_security')}</p>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('current_password')}</label>
                              <input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('new_password')}</label>
                                 <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('confirm_new_password')}</label>
                                 <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" />
                              </div>
                           </div>
                        </div>
                        <div className="mt-10 flex justify-end">
                           <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5 flex items-center gap-2">
                              <i className="fa-solid fa-shield-check"></i>
                              <span>{t('update_password')}</span>
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'company' && isAdmin && (
                  <form onSubmit={handleCompanyUpdate} className="max-w-3xl mx-auto space-y-6">
                     <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center space-x-5 mb-8 pb-8 border-b border-gray-100 dark:border-zinc-800">
                           <div className="w-16 h-16 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-600 dark:text-amber-500 text-2xl shadow-sm">
                              <i className="fa-solid fa-building"></i>
                           </div>
                           <div>
                              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('company_profile')}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('update_personal_info')}</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('company_name')}</label>
                              <input type="text" value={compData.name} onChange={e => setCompData({ ...compData, name: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('official_email')}</label>
                              <input type="email" value={compData.email} onChange={e => setCompData({ ...compData, email: e.target.value })} onBlur={e => {
                                 const val = e.target.value;
                                 if (val && !val.includes('@')) {
                                    setCompData({ ...compData, email: val.trim() + '@gmail.com' });
                                 }
                              }} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium" />
                              <p className="text-[10px] text-gray-400 pl-1">Domain @gmail.com will be added automatically if missing</p>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('contact_phone')}</label>
                              <input type="tel" value={compData.phone} onChange={e => setCompData({ ...compData, phone: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium" />
                           </div>
                           <div className="col-span-1 md:col-span-2 space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{t('main_address')}</label>
                              <textarea rows="3" value={compData.address} onChange={e => setCompData({ ...compData, address: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"></textarea>
                           </div>
                        </div>
                        <div className="mt-10 flex justify-end">
                           <button type="submit" className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 hover:shadow-amber-900/40 hover:-translate-y-0.5 flex items-center gap-2">
                              <i className="fa-solid fa-check"></i>
                              <span>{t('update_company')}</span>
                           </button>
                        </div>
                     </div>
                  </form>
               )}

               {activeTab === 'appearance' && (
                  <div className="max-w-3xl mx-auto space-y-6">
                     <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center space-x-5 mb-8 pb-8 border-b border-gray-100 dark:border-zinc-800">
                           <div className="w-16 h-16 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-600 dark:text-purple-500 text-2xl shadow-sm">
                              <i className="fa-solid fa-eye"></i>
                           </div>
                           <div>
                              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('appearance')}</h3>
                              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('customize_interface')}</p>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 group hover:border-purple-500/30 transition-all cursor-pointer">
                              <div className="flex items-center space-x-5">
                                 <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-xl`}></i>
                                 </div>
                                 <div>
                                    <h4 className="text-gray-900 dark:text-white font-bold tracking-tight">{t('dark_mode')}</h4>
                                    <p className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase tracking-wide">{t('system_defaults_dark')}</p>
                                 </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input type="checkbox" checked={theme === 'dark'} onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')} className="sr-only peer" />
                                 <div className="w-14 h-7 bg-gray-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
                              </label>
                           </div>

                           <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 group hover:border-purple-500/30 transition-all cursor-pointer">
                              <div className="flex items-center space-x-5">
                                 <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    <i className="fa-solid fa-earth-americas text-xl"></i>
                                 </div>
                                 <div>
                                    <h4 className="text-gray-900 dark:text-white font-bold tracking-tight">{t('preferred_language')}</h4>
                                    <p className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase tracking-wide">{t('set_preferred_language')}</p>
                                 </div>
                              </div>
                              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer">
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
