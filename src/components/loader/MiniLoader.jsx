import React from 'react';

const MiniLoader = () => {
  return (
    <span className="mini-loader">
      <style>{`
        .mini-loader {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgba(255, 0, 0, 0.2);
          box-shadow: 12px 0 rgba(255, 0, 0, 1);
          animation: mini-flash 0.6s ease-in-out infinite alternate;
        }

        @keyframes mini-flash {
          0% {
            background-color: rgba(255, 0, 0, 0.2);
            box-shadow: 12px 0 rgba(255, 0, 0, 1);
          }
          100% {
            background-color: rgba(255, 0, 0, 1);
            box-shadow: 12px 0 rgba(255, 0, 0, 0.2);
          }
        }
      `}</style>
    </span>
  );
};

export default MiniLoader;
