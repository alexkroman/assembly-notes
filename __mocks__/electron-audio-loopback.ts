export const AudioLoopback = jest.fn().mockImplementation(() => ({
  start: jest.fn().mockResolvedValue(true),
  stop: jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
  isRunning: jest.fn().mockReturnValue(false),
  on: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
}));

export default { AudioLoopback };
