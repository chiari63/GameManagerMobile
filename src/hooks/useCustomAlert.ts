import { useState } from 'react';

interface AlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message: string;
  buttons?: AlertButton[];
}

export const useCustomAlert = () => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({
    title: '',
    message: '',
    buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
  });

  const showAlert = (alertOptions: AlertOptions) => {
    setOptions(alertOptions);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return {
    visible,
    options,
    showAlert,
    hideAlert,
  };
};

export default useCustomAlert; 