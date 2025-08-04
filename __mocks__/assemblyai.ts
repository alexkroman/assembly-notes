const createMockTranscriber = () => {
  const mockTranscriber = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    sendAudio: jest.fn(),
    forceEndUtterance: jest.fn(),
    configureEndUtteranceSilenceThreshold: jest.fn(),
  };

  // Simulate some default event handlers
  const eventHandlers: Record<string, ((arg: any) => void)[]> = {};

  mockTranscriber.on = jest.fn((event: string, handler: (arg: any) => void) => {
    if (!eventHandlers[event]) {
      eventHandlers[event] = [];
    }
    eventHandlers[event].push(handler);
    return mockTranscriber;
  });

  return mockTranscriber;
};

export class AssemblyAI {
  lemur: any;
  realtime: any;

  constructor(_apiKey: { apiKey: string }) {
    // Mock constructor
    this.lemur = {
      task: jest.fn().mockResolvedValue({
        response: 'Mocked summary response',
      }),
    };

    this.realtime = {
      transcriber: jest.fn().mockImplementation((_config: any) => {
        return createMockTranscriber();
      }),
    };
  }
}

// Mock the real-time events
export const RealtimeEvents = {
  AudioData: 'audio-data',
  Error: 'error',
  Open: 'open',
  Close: 'close',
  SessionInformation: 'session-information',
  SessionBegins: 'session-begins',
  SessionTerminated: 'session-terminated',
  FinalTranscript: 'final-transcript',
  PartialTranscript: 'partial-transcript',
};
