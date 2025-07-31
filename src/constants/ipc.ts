export const IPC_CHANNELS = {
  // Audio
  ENABLE_LOOPBACK_AUDIO: 'enable-loopback-audio',
  DISABLE_LOOPBACK_AUDIO: 'disable-loopback-audio',
  MICROPHONE_AUDIO_DATA: 'microphone-audio-data',
  SYSTEM_AUDIO_DATA: 'system-audio-data',

  // Recording control
  START_RECORDING: 'start-recording',
  STOP_RECORDING: 'stop-recording',
  NEW_RECORDING: 'new-recording',
  LOAD_RECORDING: 'load-recording',
  RECORDING_STOPPED: 'recording-stopped',
  NEW_RECORDING_CREATED: 'new-recording-created',

  // Transcription & summary
  SUMMARIZE_TRANSCRIPT: 'summarize-transcript',
  TRANSCRIPT: 'transcript',
  SUMMARY: 'summary',
  SUMMARIZATION_STARTED: 'summarization-started',
  SUMMARIZATION_COMPLETED: 'summarization-completed',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  SAVE_PROMPT: 'save-prompt',
  SAVE_PROMPTS: 'save-prompts',
  SELECT_PROMPT: 'select-prompt',
  SAVE_SELECTED_CHANNEL: 'save-selected-channel',

  // Slack
  POST_TO_SLACK: 'post-to-slack',

  // Update
  INSTALL_UPDATE: 'install-update',
  QUIT_AND_INSTALL: 'quit-and-install',
  CHECK_FOR_UPDATES: 'check-for-updates',
  UPDATE_AVAILABLE: 'update-available',
  DOWNLOAD_PROGRESS: 'download-progress',
  UPDATE_DOWNLOADED: 'update-downloaded',

  // Recordings DB
  GET_ALL_RECORDINGS: 'get-all-recordings',
  SEARCH_RECORDINGS: 'search-recordings',
  GET_RECORDING: 'get-recording',
  DELETE_RECORDING: 'delete-recording',
  UPDATE_RECORDING_TITLE: 'update-recording-title',
  UPDATE_RECORDING_SUMMARY: 'update-recording-summary',

  // Misc
  ERROR: 'error',
  CONNECTION_STATUS: 'connection-status',
  START_AUDIO_CAPTURE: 'start-audio-capture',
  STOP_AUDIO_CAPTURE: 'stop-audio-capture',
  RESET_AUDIO_PROCESSING: 'reset-audio-processing',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];