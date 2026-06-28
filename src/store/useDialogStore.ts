import { create } from 'zustand';

export interface DialogAction {
  text: string;
  onPress?: () => void;
  style?: 'cancel' | 'destructive' | 'default';
}

interface DialogState {
  visible: boolean;
  title: string;
  content: string;
  actions: DialogAction[];
  showDialog: (title: string, content: string, actions?: DialogAction[]) => void;
  hideDialog: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  visible: false,
  title: '',
  content: '',
  actions: [],
  showDialog: (title, content, actions = [{ text: 'OK' }]) => 
    set({ visible: true, title, content, actions }),
  hideDialog: () => set({ visible: false }),
}));
