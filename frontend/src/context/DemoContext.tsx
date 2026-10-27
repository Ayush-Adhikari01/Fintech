import React, { createContext, useContext, useState } from 'react';

interface DemoContextType {
  currentUser: {
    name: string;
    email: string;
    role: string;
    institution: string;
  };
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  showDemoNotice: boolean;
  setShowDemoNotice: (v: boolean) => void;
}

const DemoContext = createContext<DemoContextType>({
  currentUser: {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@sentinel.internal',
    role: 'Senior AML Officer',
    institution: 'Sentinel Trust Bank (Simulated)',
  },
  globalSearch: '',
  setGlobalSearch: () => {},
  showDemoNotice: true,
  setShowDemoNotice: () => {},
});

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser] = useState({
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@sentinel.internal',
    role: 'Senior AML Compliance Officer',
    institution: 'Sentinel Trust Bank (Simulated)',
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [showDemoNotice, setShowDemoNotice] = useState(true);

  return (
    <DemoContext.Provider
      value={{
        currentUser,
        globalSearch,
        setGlobalSearch,
        showDemoNotice,
        setShowDemoNotice,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);
