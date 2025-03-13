import React, { createContext, useContext, ReactNode } from 'react';
import useCustomAlert from '../hooks/useCustomAlert';
import CustomAlert from '../components/CustomAlert';

interface AlertContextType {
  showAlert: (options: {
    title: string;
    message: string;
    buttons?: {
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[];
  }) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const { visible, options, showAlert, hideAlert } = useCustomAlert();

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        title={options.title}
        message={options.message}
        buttons={options.buttons}
        onDismiss={hideAlert}
      />
    </AlertContext.Provider>
  );
}; 