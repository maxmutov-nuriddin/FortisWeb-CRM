import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
   return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-dark-secondary flex items-center justify-center">
         <div className="text-center p-4">
            <div className="mb-6">
               <svg className="w-24 h-24 mx-auto text-red-600 dark:text-dark-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
            <h1 className="text-8xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
               We're sorry, the page you have looked for does not exist in our website! Maybe go to our home page or try to use a search?
            </p>
            <Link
               className="bg-red-600 dark:bg-dark-accent hover:bg-red-700 dark:hover:bg-red-600 text-white font-medium rounded-full py-3 px-8 inline-block transition-colors shadow-lg shadow-red-900/20"
               to="/"
            >
               Go Back To Home
            </Link>
         </div>
      </div>
   );
};

export default NotFound;