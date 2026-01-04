import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import PageLoader from './loader/PageLoader';

const Header = ({ toggleSidebar }) => {
   const { user, isLoading: authLoading, error: authError, getMe } = useAuthStore();

   // ===================== AUTH =====================
   useEffect(() => {
      getMe()
   }, [])

   // ===================== ERRORS =====================
   useEffect(() => {
      if (authError) console.error(authError)
   }, [authError])

   return (
      <>
         {
            authLoading ? (<PageLoader />) : (
               <header id="header" className="bg-dark-secondary border-b border-gray-800 px-4 md:px-8 py-4 shrink-0 transition-all duration-300">
                  <div className="flex items-center justify-between gap-4">

                     {/* Left Side: Hamburger & Search */}
                     <div className="flex items-center space-x-4 flex-1">
                        {/* Hamburger Menu (Mobile Only) */}
                        <button
                           onClick={toggleSidebar}
                           className="md:hidden text-gray-400 hover:text-white focus:outline-none"
                        >
                           <i className="fa-solid fa-bars text-xl"></i>
                        </button>

                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-md hidden sm:block">
                           <i className="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                           <input type="text" placeholder="Search..." className="w-full bg-dark-tertiary border border-gray-700 rounded-lg pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-dark-accent" />
                        </div>
                        {/* Mobile Search Icon (optional replacement for full bar) */}
                        <button className="sm:hidden text-gray-400 hover:text-white">
                           <i className="fa-solid fa-search text-xl"></i>
                        </button>
                     </div>

                     {/* Right Side: Icons & Profile */}
                     <div className="flex items-center space-x-3 md:space-x-6">
                        <Link to="/orders" className="relative text-gray-400 hover:text-white transition">
                           <i className="fa-solid fa-envelope text-xl"></i>
                           <span className="absolute -top-1 -right-1 bg-dark-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">3</span>
                        </Link>
                        <Link to="/team-chats" className="relative text-gray-400 hover:text-white transition">
                           <i className="fa-solid fa-bell text-xl"></i>
                           <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">7</span>
                        </Link>
                        <div className="h-8 w-px bg-gray-700 hidden md:block"></div>

                        {/* Profile Section */}
                        <div className="flex items-center space-x-3 cursor-pointer hover:bg-dark-tertiary px-2 py-1 md:px-3 md:py-2 rounded-lg transition">
                           <img
                              src={user?.data?.user.avatar || `https://ui-avatars.com/api/?name=${user?.data?.user.name}`}
                              className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-dark-accent"
                           />
                           <div className="hidden md:block">
                              <div className="text-md font-medium text-white">{user?.data?.user.name}</div>
                              <div className="text-xs text-gray-400">{user?.data?.user?.role}</div>
                           </div>
                           {/* <i className="fa-solid fa-chevron-down text-gray-400 text-sm hidden md:block"></i> */}
                        </div>
                     </div>
                  </div>
               </header>
            )
         }
      </>
   );
};

export default Header;
