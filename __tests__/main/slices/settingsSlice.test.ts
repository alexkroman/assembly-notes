import settingsReducer, {
  updateSettings,
  setAssemblyAIKey,
  setSlackBotToken,
  setSlackChannels,
} from '../../../src/main/store/slices/settingsSlice';

import type { SettingsState } from '../../../src/types/index';

describe('settingsSlice reducer', () => {
  const getInitialState = (): SettingsState =>
    settingsReducer(undefined, { type: 'unknown' }) as SettingsState;

  it('should update computed properties via updateSettings', () => {
    const prevState = getInitialState();

    const updatedState = settingsReducer(
      prevState,
      updateSettings({
        assemblyaiKey: 'key-123',
        slackBotToken: 'xoxb-token',
        slackChannels: 'C1234,C4321',
      })
    );

    expect(updatedState.assemblyaiKey).toBe('key-123');
    expect(updatedState.hasAssemblyAIKey).toBe(true);

    expect(updatedState.slackBotToken).toBe('xoxb-token');
    expect(updatedState.hasSlackBotToken).toBe(true);

    expect(updatedState.slackChannels).toBe('C1234,C4321');
    expect(updatedState.hasSlackChannels).toBe(true);
  });

  it('should set individual keys and maintain computed props', () => {
    let state = getInitialState();

    state = settingsReducer(state, setAssemblyAIKey('api-key'));
    expect(state.assemblyaiKey).toBe('api-key');
    expect(state.hasAssemblyAIKey).toBe(true);

    state = settingsReducer(state, setSlackBotToken(''));
    expect(state.slackBotToken).toBe('');
    expect(state.hasSlackBotToken).toBe(false);

    state = settingsReducer(state, setSlackChannels('CHANNEL1'));
    expect(state.slackChannels).toBe('CHANNEL1');
    expect(state.hasSlackChannels).toBe(true);
  });
});