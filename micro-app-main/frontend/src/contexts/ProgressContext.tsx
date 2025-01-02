import { createContext, useContext, useState } from 'react';

interface ProgressContextType {
  shouldRefresh: boolean;
  triggerRefresh: () => void;
}

const ProgressContext = createContext<ProgressContextType>({ 
  shouldRefresh: false, 
  triggerRefresh: () => {} 
});

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [shouldRefresh, setShouldRefresh] = useState(false);

  const triggerRefresh = () => {
    setShouldRefresh(prev => !prev);
  };

  return (
    <ProgressContext.Provider value={{ shouldRefresh, triggerRefresh }}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext); 