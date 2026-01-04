import React from 'react';
import { Link } from 'react-router-dom';

const SignIn = () => {
   return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center">
         <div className="w-full max-w-md bg-dark-secondary rounded-lg p-8 mx-4">
            <div className="flex items-center justify-between mb-8">
               <Link to="/" className="flex items-center">
                  <span className="text-dark-accent text-2xl mr-2">
                     <i className="fa fa-user-edit"></i>
                  </span>
                  <h3 className="text-dark-accent text-2xl font-bold">DarkPan</h3>
               </Link>
               <h3 className="text-white text-2xl font-bold">Sign In</h3>
            </div>
            
            <div className="mb-4">
               <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-gray-200 text-gray-900 rounded focus:outline-none" 
                  placeholder="Email address"
                  defaultValue="eve.holt@reqres.in"
               />
            </div>
            
            <div className="mb-4">
               <input 
                  type="password" 
                  className="w-full px-4 py-3 bg-gray-200 text-gray-900 rounded focus:outline-none" 
                  placeholder="Password"
                  defaultValue="....."
               />
            </div>
            
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center">
                  <input 
                     type="checkbox" 
                     id="remember" 
                     className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                  />
                  <label htmlFor="remember" className="ml-2 text-gray-400 text-sm">
                     Check me out
                  </label>
               </div>
               <a href="#" className="text-dark-accent text-sm hover:underline">
                  Forgot Password
               </a>
            </div>
            
            <button 
               type="submit" 
               className="w-full bg-dark-accent hover:bg-dark-accent text-white font-medium py-3 rounded transition-colors mb-6"
            >
               Sign In
            </button>
            
            <p className="text-center text-gray-400 text-sm">
               Don't have an Account?{' '}
               <Link to="/signup" className="text-dark-accent hover:underline">
                  Sign Up
               </Link>
            </p>
         </div>
      </div>
   );
};

export default SignIn;