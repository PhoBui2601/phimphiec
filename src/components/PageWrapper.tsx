import React from 'react';
import { motion } from 'motion/react';

interface PageWrapperProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.995,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.995,
    filter: 'blur(4px)',
  },
};

const pageTransition = {
  type: 'spring',
  stiffness: 140,
  damping: 22,
  mass: 0.8,
};

export const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full flex flex-col min-h-full"
    >
      {children}
    </motion.div>
  );
};

export default PageWrapper;
