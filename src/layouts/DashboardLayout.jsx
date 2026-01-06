import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const DashboardLayout = () => {
   const [isSidebarOpen, setSidebarOpen] = React.useState(false);
   const { user, isLoading } = useAuthStore()
   const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);


   // пока проверяем токен
   if (isLoading) return <PageLoader />

   // если НЕ авторизован → логин
   if (!user?.data?.user?._id) {
      return <Navigate to="/signin" replace />
   }

   return (
      <div id="dashboard-layout" className="flex h-screen overflow-hidden bg-dark-primary text-gray-300 font-sans">
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
