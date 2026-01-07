import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useAuthStore } from '../store/auth.store';

const ProtectedRoute = () => {
   const { isAuthenticated, isLoading } = useAuthStore();
   const location = useLocation();

   if (isLoading) {
      return (
         <div className="h-screen w-screen flex items-center justify-center bg-dark-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dark-accent"></div>
         </div>
      );
   }

   if (!isAuthenticated) {
      return <Navigate to="/signin" state={{ from: location }} replace />;
   }

   return <Outlet />;
};

export default ProtectedRoute;
