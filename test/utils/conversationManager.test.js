describe('conversationManager', () => {
  let conversationManager;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    conversationManager = require('../../src/utils/conversationManager');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('hasHistory returns false for new thread', () => {
    expect(conversationManager.hasHistory('thread123')).toBe(false);
  });

  test('hasHistory returns true after adding messages', () => {
    conversationManager.addMessages('thread123', [
      { role: 'user', content: 'Hello' },
    ]);
    expect(conversationManager.hasHistory('thread123')).toBe(true);
  });

  test('getHistory returns empty array for new thread', () => {
    const history = conversationManager.getHistory('thread123');
    expect(history).toEqual([]);
  });

  test('getHistory returns messages after adding', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    conversationManager.addMessages('thread123', messages);
    const history = conversationManager.getHistory('thread123');
    expect(history).toEqual(messages);
  });

  test('addMessages appends to existing history', () => {
    conversationManager.addMessages('thread123', [
      { role: 'user', content: 'First' },
    ]);
    conversationManager.addMessages('thread123', [
      { role: 'assistant', content: 'Second' },
    ]);
    const history = conversationManager.getHistory('thread123');
    expect(history).toHaveLength(2);
    expect(history[0].content).toBe('First');
    expect(history[1].content).toBe('Second');
  });

  test('clearHistory removes all messages for thread', () => {
    conversationManager.addMessages('thread123', [
      { role: 'user', content: 'Hello' },
    ]);
    conversationManager.clearHistory('thread123');
    expect(conversationManager.hasHistory('thread123')).toBe(false);
  });

  test('getHistory limits to MAX_HISTORY_MESSAGES', () => {
    const maxMessages = conversationManager.getMaxHistoryMessages();
    const messages = [];
    for (let i = 0; i < maxMessages + 5; i++) {
      messages.push({ role: 'user', content: `Message ${i}` });
    }
    conversationManager.addMessages('thread123', messages);
    const history = conversationManager.getHistory('thread123');
    expect(history.length).toBe(maxMessages);
    expect(history[0].content).toBe(`Message 5`); // Should keep last 20
  });

  test('getMaxHistoryMessages returns correct value', () => {
    expect(conversationManager.getMaxHistoryMessages()).toBe(20);
  });

  test('multiple threads have separate histories', () => {
    conversationManager.addMessages('thread1', [
      { role: 'user', content: 'Thread 1' },
    ]);
    conversationManager.addMessages('thread2', [
      { role: 'user', content: 'Thread 2' },
    ]);

    const history1 = conversationManager.getHistory('thread1');
    const history2 = conversationManager.getHistory('thread2');

    expect(history1[0].content).toBe('Thread 1');
    expect(history2[0].content).toBe('Thread 2');
    expect(history1).not.toEqual(history2);
  });

  test('active conversations are not expired', () => {
    conversationManager.addMessages('thread123', [
      { role: 'user', content: 'Hello' },
    ]);

    // Fast forward 1 hour
    jest.advanceTimersByTime(60 * 60 * 1000);

    // Add more messages (updates timestamp)
    conversationManager.addMessages('thread123', [
      { role: 'assistant', content: 'Response' },
    ]);

    // Fast forward another hour (total 2 hours, but timestamp was updated)
    jest.advanceTimersByTime(60 * 60 * 1000 + 15 * 60 * 1000);

    expect(conversationManager.hasHistory('thread123')).toBe(true);
  });
});
