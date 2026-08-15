import React from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';

export const isPreviewableImageUri = (imageUri: string | undefined): imageUri is string =>
  typeof imageUri === 'string' && imageUri.trim().length > 0;

type ImagePreviewModalProps = {
  visible: boolean;
  imageUri: string | undefined;
  onDismiss: () => void;
  accessibilityLabel: string;
};

export const ImagePreviewModal = ({
  visible,
  imageUri,
  onDismiss,
  accessibilityLabel,
}: ImagePreviewModalProps) => {
  if (!isPreviewableImageUri(imageUri)) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={accessibilityLabel}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar visualização da imagem"
          hitSlop={12}
          onPress={onDismiss}
          style={styles.closeButton}
        >
          <X color="#ffffff" size={26} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar visualização da imagem"
          onPress={onDismiss}
          style={styles.dismissArea}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 2,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
});
