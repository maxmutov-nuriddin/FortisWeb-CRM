import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import { useAuthStore } from '../store/auth.store';
import PageLoader from './loader/PageLoader';

const ProtectedRoute = () => {
   const { isAuthenticated, isLoading } = useAuthStore();
   const location = useLocation();

   if (isLoading) {
      return (
         <PageLoader />
      );
   }

   if (!isAuthenticated) {
      return <Navigate to="/signin" state={{ from: location }} replace />;
   }

   return <Outlet />;
};

export default ProtectedRoute;
