import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
   const [isSidebarOpen, setSidebarOpen] = React.useState(false);

   const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);



   return (
      <div id="dashboard-layout" className="flex h-screen overflow-hidden bg-white dark:bg-dark-primary text-gray-900 dark:text-gray-300 font-sans transition-colors duration-300">
         {/* Mobile Overlay */}
         {isSidebarOpen && (
            <div
               className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
               onClick={() => setSidebarOpen(false)}
            ></div>
         )}

         <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />

         <div id="main-content" className="flex-1 flex flex-col overflow-hidden w-full">
            <Header toggleSidebar={toggleSidebar} />
            <main id="dashboard-main" className="flex-1 overflow-y-auto">
               <Outlet />
            </main>
         </div>
      </div>
   );
};

export default DashboardLayout;
