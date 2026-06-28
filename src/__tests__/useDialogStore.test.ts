import { describe, it, expect, beforeEach } from 'vitest';
import { useDialogStore } from '../store/useDialogStore';

describe('useDialogStore', () => {
  beforeEach(() => {
    useDialogStore.setState({
      visible: false,
      title: '',
      content: '',
      actions: [],
    });
  });

  it('has the expected default state', () => {
    const state = useDialogStore.getState();
    expect(state.visible).toBe(false);
    expect(state.title).toBe('');
    expect(state.content).toBe('');
    expect(state.actions).toEqual([]);
  });

  it('showDialog sets visible, title, content, and actions', () => {
    const actions = [
      { text: 'Delete', style: 'destructive' as const, onPress: () => {} },
      { text: 'Cancel', style: 'cancel' as const },
    ];
    useDialogStore.getState().showDialog('Confirm', 'Delete this item?', actions);

    const state = useDialogStore.getState();
    expect(state.visible).toBe(true);
    expect(state.title).toBe('Confirm');
    expect(state.content).toBe('Delete this item?');
    expect(state.actions).toEqual(actions);
  });

  it('showDialog defaults actions to a single "OK" action when omitted', () => {
    useDialogStore.getState().showDialog('Notice', 'Saved successfully');
    const state = useDialogStore.getState();
    expect(state.actions).toEqual([{ text: 'OK' }]);
    expect(state.visible).toBe(true);
  });

  it('hideDialog clears visibility but keeps the last content', () => {
    useDialogStore.getState().showDialog('Confirm', 'Are you sure?', [
      { text: 'Yes' },
    ]);
    useDialogStore.getState().hideDialog();

    const state = useDialogStore.getState();
    expect(state.visible).toBe(false);
    // hideDialog only flips visibility; content/title persist for re-show
    expect(state.title).toBe('Confirm');
    expect(state.content).toBe('Are you sure?');
  });
});
