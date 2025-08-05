export class WebClient {
  chat = {
    postMessage: jest.fn().mockResolvedValue({
      ok: true,
      ts: '1234567890.123456',
    }),
  };

  conversations = {
    list: jest.fn().mockResolvedValue({
      ok: true,
      channels: [
        { id: 'C123', name: 'general', is_private: false },
        { id: 'C456', name: 'random', is_private: false },
      ],
    }),
    members: jest.fn().mockResolvedValue({
      ok: true,
      members: ['U123', 'U456'],
    }),
  };

  auth = {
    test: jest.fn().mockResolvedValue({
      ok: true,
      user: 'test-user',
      team: 'test-team',
    }),
  };
}
