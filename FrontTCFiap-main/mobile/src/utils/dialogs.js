import { Alert, Platform } from 'react-native';

export function showMessage(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onConfirm?.();
    return;
  }

  Alert.alert(
    title,
    message,
    onConfirm ? [{ text: 'OK', onPress: onConfirm }] : undefined
  );
}

export function confirmAction(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: onConfirm },
  ]);
}
