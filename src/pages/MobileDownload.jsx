import React from 'react';
import { FaApple, FaGooglePlay } from 'react-icons/fa';

const MobileDownload = () => {
   // Placeholder URLs - replace with actual app store links
   const APP_STORE_URL = 'https://apps.apple.com/app/your-app-id';
   const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=your.app.id';

   return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-6">
         <div className="max-w-md w-full">
            {/* App Logo */}
            <div className="flex justify-center mb-8 animate-fadeIn">
               <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl shadow-2xl flex items-center justify-center">
                  <div className="text-5xl font-bold text-white">F</div>
               </div>
            </div>

            {/* Main Content */}
            <div className="text-center mb-10 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
               <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  FortisWeb CRM
               </h1>
               <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                  Доступно в мобильном приложении
               </p>
               <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Скачайте наше приложение для лучшего опыта<br />на мобильных устройствах
               </p>
            </div>

            {/* Download Buttons */}
            <div className="space-y-4 mb-8 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
               {/* App Store Button */}
               <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-4 w-full bg-gray-900 dark:bg-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-800 text-white rounded-xl px-6 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg border border-gray-800 dark:border-zinc-800"
               >
                  <FaApple className="text-4xl" />
                  <div className="text-left">
                     <div className="text-xs opacity-70">Загрузить в</div>
                     <div className="text-xl font-semibold">App Store</div>
                  </div>
               </a>

               {/* Google Play Button */}
               <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-4 w-full bg-gray-900 dark:bg-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-800 text-white rounded-xl px-6 py-4 transition-all duration-300 transform hover:scale-105 shadow-lg border border-gray-800 dark:border-zinc-800"
               >
                  <FaGooglePlay className="text-3xl" />
                  <div className="text-left">
                     <div className="text-xs opacity-70">Доступно в</div>
                     <div className="text-xl font-semibold">Google Play</div>
                  </div>
               </a>
            </div>

            {/* Info Card */}
            <div className="glass-card p-6 rounded-xl animate-fadeIn" style={{ animationDelay: '0.3s' }}>
               <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                     <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Для использования на компьютере
                     </h3>
                     <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Откройте приложение на устройстве с экраном больше 768px (планшет или компьютер) для доступа к полной версии CRM системы.
                     </p>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-gray-500 dark:text-gray-500 text-sm animate-fadeIn" style={{ animationDelay: '0.4s' }}>
               <p>© 2026 FortisWeb CRM</p>
            </div>
         </div>
      </div>
   );
};

export default MobileDownload;
