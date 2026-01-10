const PageLoader = () => {
   return (
      <div className="loader-wrapper">
         <span className="loader " />

         <style>{`
        .loader-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loader {
          width: 48px;
          height: 48px;
          background: #fff;
          border-radius: 50%;
          animation: animloader 1s ease-in infinite;
        }

        @keyframes animloader {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
      </div>
   );
};

export default PageLoader;
