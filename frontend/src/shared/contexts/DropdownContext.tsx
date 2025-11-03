import React, { createContext, useContext, useState, useCallback } from 'react';

interface DropdownContextType {
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  closeAllDropdowns: () => void;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export const useDropdown = () => {
  const context = useContext(DropdownContext);
  // Provide default values if context is not available (for backward compatibility)
  if (!context) {
    return {
      openDropdownId: null,
      setOpenDropdownId: () => {},
      closeAllDropdowns: () => {},
    };
  }
  return context;
};

interface DropdownProviderProps {
  children: React.ReactNode;
}

export const DropdownProvider: React.FC<DropdownProviderProps> = ({ children }) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const closeAllDropdowns = useCallback(() => {
    setOpenDropdownId(null);
  }, []);

  return (
    <DropdownContext.Provider
      value={{
        openDropdownId,
        setOpenDropdownId,
        closeAllDropdowns,
      }}
    >
      {children}
    </DropdownContext.Provider>
  );
};

