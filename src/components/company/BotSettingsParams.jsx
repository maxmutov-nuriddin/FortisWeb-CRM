import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { companyBotApi } from '../../api/company-bot.api';

const BotSettingsParams = () => {
   const [status, setStatus] = useState('loading'); // loading, not_connected, connected, disabled
   const [botUsername, setBotUsername] = useState('');
   const [maskedToken, setMaskedToken] = useState('');
   const [newToken, setNewToken] = useState('');
   const [isLoading, setIsLoading] = useState(false);

   useEffect(() => {
      fetchStatus();
   }, []);

   const fetchStatus = async () => {
      try {
         const res = await companyBotApi.getStatus();
         const data = res.data.data;
         setStatus(data.status || 'not_connected');
         setBotUsername(data.botUsername || '');
         setMaskedToken(data.botToken || '');
      } catch (error) {
         console.error(error); // Fail silently or show error
      }
   };

   const handleConnect = async (e) => {
      e.preventDefault();
      if (!newToken) return toast.error('Please enter a Bot Token');

      setIsLoading(true);
      try {
         await companyBotApi.connect(newToken);
         toast.success('Bot connected successfully!');
         setNewToken('');
         fetchStatus();
      } catch (error) {
         toast.error(error.response?.data?.message || 'Connection failed');
      } finally {
         setIsLoading(false);
      }
   };

   const handleDisable = async () => {
      if (!window.confirm('Are you sure you want to disable the bot? Current sessions might be interrupted.')) return;

      setIsLoading(true);
      try {
         await companyBotApi.disable();
         toast.success('Bot disabled');
         fetchStatus();
      } catch (error) {
         toast.error(error.response?.data?.message || 'Disable failed');
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <div className="max-w-3xl mx-auto space-y-6">
         <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">

            {/* Header */}
            <div className="flex items-center space-x-5 mb-8 pb-8 border-b border-gray-100 dark:border-zinc-800">
               <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 text-3xl shadow-sm">
                  <i className="fa-brands fa-telegram"></i>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Telegram Bot</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Connect a bot to receive orders automatically.</p>
               </div>
            </div>

            {/* Status Indicator */}
            <div className="mb-8 p-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
               <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Status</p>
                  <div className="flex items-center gap-2">
                     <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                     <span className={`text-lg font-black ${status === 'connected' ? 'text-green-600 dark:text-green-500' : 'text-gray-600 dark:text-gray-400'}`}>
                        {status === 'connected' ? 'Active & Running' : (status === 'disabled' ? 'Disabled' : 'Not Connected')}
                     </span>
                  </div>
               </div>
               {status === 'connected' && (
                  <div className="text-right">
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bot Username</p>
                     <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer" className="text-lg font-bold text-sky-500 hover:underline">
                        @{botUsername}
                     </a>
                  </div>
               )}
            </div>

            {/* Connection Form */}
            {status !== 'connected' ? (
               <form onSubmit={handleConnect} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Bot Token</label>
                     <div className="relative">
                        <input
                           type="text"
                           value={newToken}
                           onChange={e => setNewToken(e.target.value)}
                           className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-mono text-sm"
                           placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                           <i className="fa-solid fa-key"></i>
                        </div>
                     </div>
                     <p className="text-xs text-gray-400 font-medium pl-1">
                        Get this token from <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline">@BotFather</a> on Telegram.
                     </p>
                  </div>

                  <button
                     type="submit"
                     disabled={isLoading}
                     className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-sky-900/20 hover:shadow-sky-900/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                     {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-plug"></i>}
                     <span>Connect Bot</span>
                  </button>
               </form>
            ) : (
               <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                     <div className="flex gap-3">
                        <i className="fa-solid fa-check-circle text-green-500 mt-1"></i>
                        <div>
                           <h4 className="font-bold text-green-700 dark:text-green-400">Bot is successfully connected!</h4>
                           <p className="text-sm text-green-600/80 dark:text-green-500/70 mt-1">
                              Your clients can now use <b>@{botUsername}</b> to place orders. All orders will automatically appear in your CRM.
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                     <h4 className="font-bold text-gray-900 dark:text-white mb-4">Danger Zone</h4>
                     <button
                        onClick={handleDisable}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-400 font-bold text-sm flex items-center gap-2 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                     >
                        <i className="fa-solid fa-power-off"></i>
                        <span>Disable Bot Integration</span>
                     </button>
                  </div>
               </div>
            )}

         </div>
      </div>
   );
};

export default BotSettingsParams;
