import React from 'react';

const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 dark:bg-black/80 backdrop-blur-md transition-all duration-500">
      <div className="relative flex flex-col items-center">
        {/* Outer Ring */}
        <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-zinc-800 border-t-red-500 dark:border-t-red-600 animate-spin"></div>

        {/* Inner Pulsing Dot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
        </div>

        {/* Loading Text */}
        <div className="mt-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse">
          Loading
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
