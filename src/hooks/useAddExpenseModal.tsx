import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AddExpenseInitialMode = 'manual' | 'scan';

interface AddExpenseModalContextValue {
  isOpen: boolean;
  initialMode: AddExpenseInitialMode;
  openModal: (mode?: AddExpenseInitialMode) => void;
  closeModal: () => void;
  onSubmitSuccess?: () => void;
  setOnSubmitSuccess: (cb: (() => void) | undefined) => void;
}

const AddExpenseModalContext = createContext<AddExpenseModalContextValue | null>(null);

export const AddExpenseModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<AddExpenseInitialMode>('manual');
  const [onSubmitSuccess, setOnSubmitSuccess] = useState<(() => void) | undefined>(undefined);

  const openModal = useCallback((mode: AddExpenseInitialMode = 'manual') => {
    setInitialMode(mode);
    setIsOpen(true);
  }, []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const value = useMemo<AddExpenseModalContextValue>(
    () => ({ isOpen, initialMode, openModal, closeModal, onSubmitSuccess, setOnSubmitSuccess }),
    [isOpen, initialMode, openModal, closeModal, onSubmitSuccess],
  );

  return <AddExpenseModalContext.Provider value={value}>{children}</AddExpenseModalContext.Provider>;
};

export const useAddExpenseModal = () => {
  const ctx = useContext(AddExpenseModalContext);
  if (!ctx) {
    throw new Error('useAddExpenseModal must be used within an AddExpenseModalProvider');
  }
  return ctx;
};
