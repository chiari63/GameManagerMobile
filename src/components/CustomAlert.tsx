import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Modal, Text, Button, useTheme } from 'react-native-paper';
import { appColors } from '../theme';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
  buttons?: {
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }[];
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onDismiss,
  buttons = [{ text: 'OK', onPress: () => {}, style: 'default' }],
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.buttonContainer}>
          {buttons.map((button, index) => (
            <Button
              key={index}
              mode={button.style === 'cancel' ? 'outlined' : 'contained'}
              onPress={() => {
                button.onPress();
                onDismiss();
              }}
              style={[
                styles.button,
                button.style === 'destructive' && { backgroundColor: appColors.destructive },
                button.style === 'cancel' && { borderColor: theme.colors.outline }
              ]}
              labelStyle={[
                styles.buttonLabel,
                button.style === 'cancel' && { color: theme.colors.onSurface }
              ]}
            >
              {button.text}
            </Button>
          ))}
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#94a3b8',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomAlert; 