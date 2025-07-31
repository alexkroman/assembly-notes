import transcriptionReducer, {
  addTranscriptSegment,
  updateTranscriptBuffer,
  clearTranscription,
} from '../../../src/main/store/slices/transcriptionSlice';

import type { TranscriptionState, TranscriptSegment } from '../../../src/types/redux';

describe('transcriptionSlice reducer', () => {
  const getInitialState = (): TranscriptionState =>
    transcriptionReducer(undefined, { type: 'unknown' }) as TranscriptionState;

  it('should build currentTranscript from final segments', () => {
    const segment1: TranscriptSegment = {
      text: 'Hello',
      isFinal: true,
      timestamp: 0,
      source: 'microphone',
    };

    const segment2: TranscriptSegment = {
      text: 'world',
      isFinal: true,
      timestamp: 1,
      source: 'microphone',
    };

    let state = getInitialState();

    state = transcriptionReducer(state, addTranscriptSegment(segment1));
    expect(state.currentTranscript).toBe('Hello');

    state = transcriptionReducer(state, addTranscriptSegment(segment2));
    expect(state.currentTranscript).toBe('Hello world');
  });

  it('should update transcript buffers independently', () => {
    let state = getInitialState();

    state = transcriptionReducer(
      state,
      updateTranscriptBuffer({ source: 'microphone', text: 'mic text' })
    );
    expect(state.microphoneTranscriptBuffer).toBe('mic text');
    expect(state.systemAudioTranscriptBuffer).toBe('');

    state = transcriptionReducer(
      state,
      updateTranscriptBuffer({ source: 'system', text: 'sys text' })
    );
    expect(state.systemAudioTranscriptBuffer).toBe('sys text');
  });

  it('clearTranscription should reset relevant fields', () => {
    let state: TranscriptionState = {
      ...getInitialState(),
      currentTranscript: 'some text',
      microphoneTranscriptBuffer: 'buf',
      systemAudioTranscriptBuffer: 'buf2',
      segments: [
        {
          text: 'temp',
          isFinal: false,
          timestamp: 0,
          source: 'microphone',
        },
      ],
      error: 'oops',
    };

    state = transcriptionReducer(state, clearTranscription());

    expect(state.currentTranscript).toBe('');
    expect(state.segments).toHaveLength(0);
    expect(state.microphoneTranscriptBuffer).toBe('');
    expect(state.systemAudioTranscriptBuffer).toBe('');
    expect(state.error).toBeNull();
  });
});