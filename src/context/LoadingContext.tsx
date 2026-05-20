import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  progress: number;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  progress: 0,
  startLoading: () => {},
  stopLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = () => {
    // Clear any existing intervals/timeouts
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);

    setIsLoading(true);
    setProgress(10); // Start at 10%

    // Fast-jump to 35% in the first 100ms
    setTimeout(() => {
      setProgress(35);
    }, 100);

    // Slowly increment to 90% over time
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) {
          // Slow down even more near the top
          return prev + 0.5 > 92 ? 92 : prev + 0.5;
        }
        if (prev >= 70) {
          return prev + 1;
        }
        return prev + 2;
      });
    }, 200);
  };

  const stopLoading = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setProgress(100);

    // Let the bar finish animating to 100% width, then hide the overlay
    finishTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 400); // Give 400ms transition time
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, progress, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};
