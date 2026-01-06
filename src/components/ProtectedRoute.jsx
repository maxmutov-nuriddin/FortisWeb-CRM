import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';

const ProtectedRoute = () => {
   const token = Cookies.get('token');
   const location = useLocation();

   if (!token) {
      // Redirect to login page, but save the current location they were trying to go to
      return <Navigate to="/signin" state={{ from: location }} replace />;
   }

   return <Outlet />;
};

export default ProtectedRoute;
