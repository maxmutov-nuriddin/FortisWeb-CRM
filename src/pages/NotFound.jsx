import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth.store';

const NotFound = () => {
   const { t } = useTranslation();
   const navigate = useNavigate();
   const { user } = useAuthStore();
   const userData = user?.data?.user || user?.user || user;

   const handleBack = () => {
      const restrictedPaths = ['/orders', '/company', '/profiles'];
      const referrer = document.referrer;

      const isRestrictedForUser = (path) => {
         if (path === '/company') return userData?.role !== 'super_admin';
         if (path === '/orders' || path === '/profiles') {
            return ['employee', 'worker', 'frontend', 'backend', 'marketer', 'designer'].includes(userData?.role);
         }
         return false;
      };

      // If we're coming from a path that is restricted for THIS user, go home
      const comingFromRestricted = restrictedPaths.some(path => referrer.includes(path) && isRestrictedForUser(path));

      if (comingFromRestricted || window.history.length <= 1) {
         navigate('/');
      } else {
         window.history.back();
      }
   };

   return (
      <div className="w-full min-h-screen bg-gray-50/50 dark:bg-black flex items-center justify-center p-6 overflow-hidden relative">
         {/* Background Elements */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
         </div>

         <div className="relative text-center max-w-2xl mx-auto z-10">
            <div className="mb-8 relative inline-block">
               <h1 className="text-[150px] md:text-[200px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-900 select-none">
                  404
               </h1>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="text-4xl md:text-5xl text-red-500 dark:text-red-500 animate-bounce">
                     <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
               </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
               {t('page_not_found')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-10 max-w-md mx-auto font-medium leading-relaxed">
               {t('page_not_found_desc')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Link
                  to="/"
                  className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-gray-900/20 dark:shadow-white/20 flex items-center justify-center gap-2"
               >
                  <i className="fa-solid fa-house"></i>
                  <span>{t('go_home')}</span>
               </Link>
               <button
                  onClick={handleBack}
                  className="w-full sm:w-auto px-8 py-3.5 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-800 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
               >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>{t('go_back')}</span>
               </button>
            </div>
         </div>
      </div>
   );
};

export default NotFound;