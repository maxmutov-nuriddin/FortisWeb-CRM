import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen, toggleSidebar }) => {
   const location = useLocation();

   // Check if link is active, including sub-routes or specific matches
   const isActive = (path) => {
      if (path === '/' && location.pathname !== '/') return 'text-gray-400 hover:bg-dark-tertiary hover:text-white';
      return location.pathname.startsWith(path) && (path !== '/' || location.pathname === '/')
         ? 'bg-dark-accent text-white'
         : 'text-gray-400 hover:bg-dark-tertiary hover:text-white';
   };

   return (
      <aside
         id="sidebar"
         className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-dark-secondary border-r border-gray-800 flex flex-col h-full transform transition-transform duration-300 ease-in-out
            md:static md:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
         `}
      >
         <div id="logo-section" className="p-6 border-b border-gray-800">
            <Link to="/" className="flex items-center space-x-3">
               <div className="w-12 h-12 flex items-center justify-center">
                  <img className='rounded-full border-2 border-dark-accent' src="fortislogo.JPG" alt="" />
               </div>
               <span className="text-xl font-bold text-white">FortisWeb</span>
            </Link>
         </div>

         <nav id="sidebar-nav" className="flex-1 py-6 px-3 overflow-y-auto">
            <div className="space-y-1">
               <Link to="/" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/')}`}>
                  <i className="fa-solid fa-chart-line w-5"></i>
                  <span className="font-medium">Dashboard</span>
               </Link>
               <Link to="/orders" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/orders')}`}>
                  <i className="fa-brands fa-telegram w-5"></i>
                  <span className="font-medium">Orders</span>
                  <span className="ml-auto bg-dark-accent text-white text-xs px-2 py-1 rounded-full">12</span>
               </Link>
               <Link to="/profiles" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/profiles')}`}>
                  <i className="fa-solid fa-users w-5"></i>
                  <span className="font-medium">Profiles</span>
               </Link>
               <Link to="/tasks" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/tasks')}`}>
                  <i className="fa-solid fa-tasks w-5"></i>
                  <span className="font-medium">Tasks</span>
               </Link>
               <Link to="/team-chats" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/team')}`}>
                  <i className="fa-solid fa-comments w-5"></i>
                  <span className="font-medium">Team Chats</span>
                  <span className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-full">5</span>
               </Link>
               <Link to="/payments" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/payments')}`}>
                  <i className="fa-solid fa-credit-card w-5"></i>
                  <span className="font-medium">Payments</span>
               </Link>
               <Link to="/projects" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/projects')}`}>
                  <i className="fa-solid fa-folder-open w-5"></i>
                  <span className="font-medium">Projects</span>
               </Link>
               <Link to="/settings" className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive('/settings')}`}>
                  <i className="fa-solid fa-cog w-5"></i>
                  <span className="font-medium">Settings</span>
               </Link>
            </div>

            <div className="mt-8 px-4">
               <div className="bg-dark-tertiary rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                     <i className="fa-solid fa-bolt text-dark-accent"></i>
                     <span className="text-sm font-semibold text-white">Quick Stats</span>
                  </div>
                  <div className="space-y-2 text-xs">
                     <div className="flex justify-between">
                        <span className="text-gray-400">Active Projects</span>
                        <span className="text-white font-semibold">24</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-gray-400">Team Members</span>
                        <span className="text-white font-semibold">18</span>
                     </div>
                  </div>
               </div>
            </div>
         </nav>

         <div id="sidebar-footer" className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3">
               <img src="./fortislogo.JPG" alt="Profile" className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-dark-accent" />
               <div className="flex-1">
                  <div className="text-md font-medium text-white">FortisWeb</div>
                  <div className="text-xs text-dark-accent">Main Admin</div>
               </div>
               <i className="fa-solid fa-sign-out-alt text-gray-400 hover:text-white cursor-pointer"></i>
            </div>
         </div>
      </aside>
   );
};

export default Sidebar;
