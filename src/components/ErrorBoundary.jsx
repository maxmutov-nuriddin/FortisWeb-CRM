import React, { Component } from 'react';
import { toast } from 'react-toastify';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends Component {
   constructor(props) {
      super(props);
      this.state = {
         hasError: false,
         error: null,
         errorInfo: null
      };
   }

   static getDerivedStateFromError(error) {
      return { hasError: true };
   }

   componentDidCatch(error, errorInfo) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);

      this.setState({
         error,
         errorInfo
      });

      if (this.props.showToast !== false) {
         toast.error('Something went wrong. Please try again.');
      }

      if (this.props.onError) {
         this.props.onError(error, errorInfo);
      }
   }

   handleReset = () => {
      this.setState({
         hasError: false,
         error: null,
         errorInfo: null
      });

      if (this.props.onReset) {
         this.props.onReset();
      }
   };

   render() {
      if (this.state.hasError) {
         if (this.props.fallback) {
            return typeof this.props.fallback === 'function'
               ? this.props.fallback(this.state.error, this.handleReset)
               : this.props.fallback;
         }

         return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-6">
               <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-200 dark:border-zinc-800 shadow-xl">
                  <div className="flex justify-center mb-6">
                     <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <i className="fa-solid fa-exclamation-triangle text-4xl text-red-600 dark:text-red-500"></i>
                     </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
                     Oops! Something went wrong
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                     We encountered an unexpected error. Don't worry, your data is safe.
                  </p>

                  {process.env.NODE_ENV === 'development' && this.state.error && (
                     <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30">
                        <p className="text-xs font-mono text-red-800 dark:text-red-400 break-all">
                           {this.state.error.toString()}
                        </p>
                     </div>
                  )}

                  <div className="flex flex-col gap-3">
                     <button
                        onClick={this.handleReset}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                     >
                        <i className="fa-solid fa-rotate-right mr-2"></i>
                        Try Again
                     </button>

                     <button
                        onClick={() => window.location.href = '/'}
                        className="w-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-bold py-3 px-6 rounded-xl transition-all duration-200"
                     >
                        <i className="fa-solid fa-home mr-2"></i>
                        Go to Dashboard
                     </button>
                  </div>
               </div>
            </div>
         );
      }

      return this.props.children;
   }
}

export default ErrorBoundary;
