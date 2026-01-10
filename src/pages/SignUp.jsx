/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'react-toastify';

const SignUp = () => {
   const navigate = useNavigate();
   const {
      register,
      isAuthenticated,
      isLoading: authLoading,
      error: authError,
      clearError
   } = useAuthStore();

   const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      role: 'super_admin'
   });
   const [isLoading, setIsLoading] = useState(false);
   const [showPassword, setShowPassword] = useState(false);

   useEffect(() => {
      if (isAuthenticated) {
         navigate('/signin');
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
         await register(formData);
         toast.success(`Welcome ${formData.name}`, {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         })
      } catch (error) {
         console.error('Registration failed:', error);
         toast.error(('Registration failed:', error), {
            position: 'top-right',
            autoClose: 5000,
            closeOnClick: false,
            draggable: false,
            theme: 'dark',
         })
      } finally {
         setIsLoading(false);
      }
   };

   return (
      <div className="w-full min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
         {/* Animated Gradient Background */}
         <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black z-0"></div>
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
         </div>

         <div className="w-full max-w-md bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mx-4 border border-white/10 relative z-10">
            <div className="flex flex-col items-center mb-8">
               <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-red-600/30 mb-4">
                  F
               </div>
               <h2 className="text-3xl font-black text-white tracking-tight">Create Account</h2>
               <p className="text-gray-400 text-sm mt-2">Join FortisWeb today</p>
            </div>

            {authError && (
               <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                  <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                  <p className="text-red-400 text-sm font-medium">{authError}</p>
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
               <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Full Name</label>
                  <div className="relative">
                     <i className="fa-regular fa-user absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                     <input
                        type="text"
                        name="name"
                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all placeholder-gray-600"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        required
                     />
                  </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Email Address</label>
                  <div className="relative">
                     <i className="fa-regular fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                     <input
                        type="email"
                        name="email"
                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all placeholder-gray-600"
                        placeholder="name@email.com"
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
                  </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Password</label>
                  <div className="relative">
                     <i className="fa-solid fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                     <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all placeholder-gray-600"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={6}
                     />
                     <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none"
                     >
                        {showPassword ? <i className="fa-solid fa-eye-slash"></i> : <i className="fa-solid fa-eye"></i>}
                     </button>
                  </div>
               </div>

               <button
                  type="submit"
                  disabled={isLoading || authLoading}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-900/40 hover:shadow-red-900/60 hover:-translate-y-0.5 mt-2"
               >
                  {isLoading || authLoading ? (
                     <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-circle-notch animate-spin"></i>
                        Creating Account...
                     </span>
                  ) : (
                     'Sign Up'
                  )}
               </button>
            </form>

            <div className="mt-8 text-center">
               <p className="text-gray-500 text-sm">
                  Already have an account?{' '}
                  <Link to="/signin" className="text-white font-bold hover:text-red-500 transition-colors">
                     Sign In
                  </Link>
               </p>
            </div>
         </div>
      </div>
   );
};

export default SignUp;