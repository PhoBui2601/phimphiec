import React, { useEffect, useState } from 'react';
import { useLoading } from '../context/LoadingContext';
import { motion, AnimatePresence } from 'motion/react';
import { Film } from 'lucide-react';

const loadingMessages = [
  'Đang kết nối phòng chiếu...',
  'Đang chuẩn bị ghế ngồi...',
  'Đang cuộn băng phim...',
  'Đang tải trải nghiệm PhimPhiếc...',
];

export const GlobalLoader: React.FC = () => {
  const { isLoading, progress } = useLoading();
  const [messageIdx, setMessageIdx] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  // Cycle messages for loading entertainment
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setMessageIdx((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      setMessageIdx(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Delay the full glass overlay by 150ms to avoid flickering on sub-150ms requests
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => {
        setShowOverlay(true);
      }, 150);
    } else {
      setShowOverlay(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  return (
    <>
      {/* 1. YouTube-Style Top Glowing Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-sky-400 via-violet-500 to-pink-500 z-[9999] pointer-events-none transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          opacity: progress > 0 && progress < 100 ? 1 : 0,
          boxShadow: '0 0 12px rgba(14, 165, 233, 0.8), 0 0 4px rgba(236, 72, 153, 0.6)'
        }}
      >
        {/* Glowing running head tip */}
        <div className="absolute right-0 top-0 h-full w-[80px] bg-gradient-to-r from-transparent to-white/60 blur-[2px] animate-pulse" />
      </div>

      {/* 2. Liquid Glass Loading Overlay */}
      <AnimatePresence>
        {isLoading && showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xl pointer-events-auto select-none"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-[20%] left-[10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-violet-600/10 blur-[100px] sm:blur-[130px] animate-[pulse_6s_ease-in-out_infinite] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-pink-500/10 blur-[100px] sm:blur-[130px] animate-[pulse_8s_ease-in-out_infinite_1s] pointer-events-none" />
            <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[90px] sm:blur-[120px] animate-[pulse_7s_ease-in-out_infinite_2s] pointer-events-none" />

            {/* Glowing Logo & Concentric Spinner Container */}
            <div className="relative flex items-center justify-center w-36 h-36 mb-8">
              {/* Outer Spin Ring */}
              <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-sky-400/80 border-l-transparent border-b-transparent animate-[spin_1.5s_linear_infinite]" />
              {/* Inner Reverse Spin Ring */}
              <div className="absolute inset-4 rounded-full border-b-2 border-l-2 border-pink-500/80 border-t-transparent border-r-transparent animate-[spin_1.2s_linear_reverse_infinite]" />
              {/* Pulsing Decorative Glow Ring */}
              <div className="absolute inset-8 rounded-full bg-gradient-to-r from-sky-400/10 to-violet-500/10 animate-ping opacity-75" />
              
              {/* Center Icon/Branding */}
              <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 via-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-sky-500/25 border border-white/20">
                <Film className="w-6 h-6 text-white animate-[pulse_2s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Loading text messages */}
            <div className="text-center relative z-10 px-4">
              <h2 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-sky-300 drop-shadow-md">
                PHIMPHIẾC
              </h2>
              <div className="h-6 mt-2 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIdx}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="text-xs sm:text-sm text-sky-400/75 font-semibold tracking-wide"
                  >
                    {loadingMessages[messageIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Micro loading bar inside card as structural anchor */}
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mt-6 border border-white/5 relative z-10">
              <motion.div 
                className="h-full bg-gradient-to-r from-sky-400 to-violet-500"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalLoader;
