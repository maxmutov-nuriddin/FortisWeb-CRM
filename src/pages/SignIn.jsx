import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const SignIn = () => {
   const navigate = useNavigate();
   const {
      login,
      isAuthenticated,
      isLoading: authLoading,
      error: authError,
      clearError
   } = useAuthStore();

   const [formData, setFormData] = useState({
      email: '',
      password: ''
   });
   const [isLoading, setIsLoading] = useState(false);
   const [showPassword, setShowPassword] = useState(false);

   useEffect(() => {
      if (isAuthenticated) {
         navigate('/');
      }
   }, [isAuthenticated, navigate]);

   useEffect(() => {
      return () => {
         if (clearError) clearError();
      };
   }, [clearError]);

   const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
         ...prev,
         [name]: value
      }));
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setIsLoading(true);

      try {
         await login(formData);
      } catch (error) {
         console.error('Login failed:', error);
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <div className="w-full min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center">
         <div className="w-full max-w-md bg-white dark:bg-dark-secondary rounded-xl shadow-xl dark:shadow-none p-8 mx-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-8">
               <Link to="/" className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FortisWeb</h1>
               </Link>
               <h3 className="text-gray-900 dark:text-white text-xl font-bold">Sign In</h3>
            </div>

            {authError && (
               <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500 rounded-lg">
                  <p className="text-red-600 dark:text-red-500 text-sm">{authError}</p>
               </div>
            )}

            <form onSubmit={handleSubmit}>
               <div className="mb-4">
                  <input
                     type="email"
                     name="email"
                     className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-red-500 dark:focus:border-dark-accent"
                     placeholder="Email address"
                     value={formData.email}
                     onChange={handleChange}
                     onBlur={e => {
                        const val = e.target.value;
                        if (val && !val.includes('@')) {
                           setFormData(prev => ({ ...prev, email: val.trim() + '@gmail.com' }));
                        }
                     }}
                     required
                  />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                     Domain @gmail.com will be added automatically if missing
                  </p>
               </div>

               <div className="mb-4 relative">
                  <input
                     type={showPassword ? "text" : "password"}
                     name="password"
                     className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-red-500 dark:focus:border-dark-accent pr-12"
                     placeholder="Password"
                     value={formData.password}
                     onChange={handleChange}
                     required
                     minLength={6}
                  />
                  <button
                     type="button"
                     onClick={() => setShowPassword(!showPassword)}
                     className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none"
                  >
                     {showPassword ? (
                        <i className="fa fa-eye-slash"></i>
                     ) : (
                        <i className="fa fa-eye"></i>
                     )}
                  </button>
               </div>

               <div className="flex items-center justify-end mb-6">
                  <Link to="/forgot-password" className="text-red-600 dark:text-dark-accent text-sm hover:underline">
                     Forgot Password
                  </Link>
               </div>

               <button
                  type="submit"
                  disabled={isLoading || authLoading}
                  className="w-full bg-red-600 dark:bg-dark-accent hover:bg-red-700 dark:hover:bg-red-600 text-white font-medium py-3 rounded-lg transition-colors mb-6 shadow-lg shadow-red-900/20"
               >
                  {isLoading || authLoading ? (
                     <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing In...
                     </span>
                  ) : (
                     'Sign In'
                  )}
               </button>
            </form>

            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
               Don't have an Account?{' '}
               <Link to="/signup" className="text-red-600 dark:text-dark-accent hover:underline">
                  Sign Up
               </Link>
            </p>
         </div>
      </div>
   );
};

export default SignIn;