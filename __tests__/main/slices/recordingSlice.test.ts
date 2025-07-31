import recordingReducer, {
  updateConnectionStatus,
  setRecordingError,
} from '../../../src/main/store/slices/recordingSlice';

import type { RecordingState } from '../../../src/types/redux';

describe('recordingSlice reducer', () => {
  const getInitialState = (): RecordingState =>
    recordingReducer(undefined, { type: 'unknown' }) as RecordingState;

  it('should clear error when both streams connected', () => {
    // start with error state
    let state: RecordingState = {
      ...getInitialState(),
      error: 'microphone disconnected',
    };

    // Connect microphone only
    state = recordingReducer(
      state,
      updateConnectionStatus({ stream: 'microphone', connected: true })
    );
    // Error should persist because system still false
    expect(state.error).toBe('microphone disconnected');

    // Connect system stream
    state = recordingReducer(
      state,
      updateConnectionStatus({ stream: 'system', connected: true })
    );

    // Now both connected, error should be cleared
    expect(state.connectionStatus.microphone).toBe(true);
    expect(state.connectionStatus.system).toBe(true);
    expect(state.error).toBeNull();
  });

  it('setRecordingError should set status to error and assign message', () => {
    const state = recordingReducer(
      getInitialState(),
      setRecordingError('Something went wrong')
    );

    expect(state.status).toBe('error');
    expect(state.error).toBe('Something went wrong');
  });
});