import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Snackbar, Dialog, Portal, Button, Text, useTheme } from 'react-native-paper';
import { useToastStore } from '../store/useToastStore';
import { useDialogStore } from '../store/useDialogStore';

export function GlobalUI() {
  const { visible: toastVisible, message, type, hideToast } = useToastStore();
  const { visible: dialogVisible, title, content, actions, hideDialog } = useDialogStore();
  const theme = useTheme();

  // Dialog 
  const renderActions = () => {
    return actions.map((action, index) => {
      const isDestructive = action.style === 'destructive';
      const isCancel = action.style === 'cancel';
      let textColor = theme.colors.primary;
      if (isDestructive) textColor = theme.colors.error;
      if (isCancel) textColor = theme.colors.onSurfaceVariant;
      
      return (
        <Button 
          key={index} 
          onPress={() => {
            hideDialog();
            if (action.onPress) {
                // allow dialog UI to close smoothly before executing action
                setTimeout(() => action.onPress!(), 150);
            }
          }}
          textColor={textColor}
        >
          {action.text}
        </Button>
      );
    });
  };

  return (
    <>
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog} style={{ backgroundColor: theme.colors.surface }}>
          {title ? <Dialog.Title style={{ color: theme.colors.onSurface }}>{title}</Dialog.Title> : null}
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{content}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            {renderActions()}
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={toastVisible}
        onDismiss={hideToast}
        duration={3000}
        style={{
           backgroundColor: type === 'error' ? theme.colors.error : (type === 'success' ? '#4CAF50' : theme.colors.elevation.level3) 
        }}
        action={{
          label: 'OK',
          onPress: hideToast,
          textColor: type === 'error' ? theme.colors.onError : (type === 'success' ? '#fff' : theme.colors.primary),
        }}
      >
        <Text style={{ color: type === 'error' ? theme.colors.onError : (type === 'success' ? '#fff' : theme.colors.onSurface) }}>
          {message}
        </Text>
      </Snackbar>
    </>
  );
}
