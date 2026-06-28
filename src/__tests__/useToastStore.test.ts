import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from '../store/useToastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({
      visible: false,
      message: '',
      type: 'info',
    });
  });

  it('has the expected default state', () => {
    const state = useToastStore.getState();
    expect(state.visible).toBe(false);
    expect(state.message).toBe('');
    expect(state.type).toBe('info');
  });

  it('showToast sets message and visibility with an explicit type', () => {
    useToastStore.getState().showToast('Item added', 'success');
    const state = useToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.message).toBe('Item added');
    expect(state.type).toBe('success');
  });

  it('showToast defaults type to info when omitted', () => {
    useToastStore.getState().showToast('Something happened');
    const state = useToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.message).toBe('Something happened');
    expect(state.type).toBe('info');
  });

  it('supports all toast types', () => {
    const { showToast } = useToastStore.getState();

    showToast('ok', 'success');
    expect(useToastStore.getState().type).toBe('success');

    showToast('bad', 'error');
    expect(useToastStore.getState().type).toBe('error');

    showToast('note', 'info');
    expect(useToastStore.getState().type).toBe('info');
  });

  it('hideToast clears visibility but keeps the last message', () => {
    useToastStore.getState().showToast('Saved', 'success');
    useToastStore.getState().hideToast();
    const state = useToastStore.getState();
    expect(state.visible).toBe(false);
    expect(state.message).toBe('Saved');
  });
});
