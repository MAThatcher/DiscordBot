const { EventEmitter } = require('events');
const { Events } = require('discord.js');

let mockSpawn;
let mockConversationManager;

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('../../src/utils/conversationManager', () => ({
  hasHistory: jest.fn(),
  getHistory: jest.fn(),
  addMessages: jest.fn(),
  clearHistory: jest.fn(),
  getMaxHistoryMessages: jest.fn(() => 20),
}));

beforeEach(() => {
  jest.clearAllMocks();
  const { spawn } = require('child_process');
  mockSpawn = spawn;
  mockConversationManager = require('../../src/utils/conversationManager');
  mockConversationManager.getHistory.mockReturnValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('messageCreate event', () => {
  test('messageCreate has correct event name', () => {
    const messageCreate = require('../../src/events/messageCreate');
    expect(messageCreate.name).toBe(Events.MessageCreate);
  });

  test('messageCreate ignores bot messages', async () => {
    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: true,
      },
    };

    await messageCreate.execute(message);

    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('messageCreate ignores messages not in threads', async () => {
    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: false,
      },
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    await messageCreate.execute(message);

    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('messageCreate ignores threads without history', async () => {
    mockConversationManager.hasHistory.mockReturnValue(false);

    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: false,
      },
      channel: {
        isThread: jest.fn(() => true),
      },
      channelId: 'thread123',
    };

    await messageCreate.execute(message);

    expect(mockConversationManager.hasHistory).toHaveBeenCalledWith('thread123');
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('messageCreate ignores users without Vibe Prompter role', async () => {
    mockConversationManager.hasHistory.mockReturnValue(true);

    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: false,
      },
      channel: {
        isThread: jest.fn(() => true),
        sendTyping: jest.fn().mockResolvedValue(undefined),
      },
      channelId: 'thread123',
      member: {
        roles: {
          cache: {
            some: jest.fn(() => false),
          },
        },
      },
    };

    await messageCreate.execute(message);

    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('messageCreate processes message in thread with history', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);
    mockConversationManager.hasHistory.mockReturnValue(true);

    const existingHistory = [
      { role: 'user', content: 'Previous message' },
      { role: 'assistant', content: 'Previous response' },
    ];
    mockConversationManager.getHistory.mockReturnValue(existingHistory);

    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: false,
      },
      channel: {
        isThread: jest.fn(() => true),
        sendTyping: jest.fn().mockResolvedValue(undefined),
      },
      channelId: 'thread123',
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      content: 'Follow-up question',
      reply: jest.fn().mockResolvedValue(undefined),
    };

    const executePromise = messageCreate.execute(message);

    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('AI response'));
    mockProcess.emit('close', 0);

    await executePromise;

    expect(message.channel.sendTyping).toHaveBeenCalled();
    expect(mockConversationManager.getHistory).toHaveBeenCalledWith('thread123');
    expect(mockSpawn).toHaveBeenCalledWith('python3', [
      expect.stringContaining('ollama_cli'),
      'Follow-up question',
      JSON.stringify(existingHistory),
    ]);
    expect(message.reply).toHaveBeenCalledWith('AI response');
  });

  test('messageCreate updates conversation history after response', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);
    mockConversationManager.hasHistory.mockReturnValue(true);
    mockConversationManager.getHistory.mockReturnValue([]);

    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: false,
      },
      channel: {
        isThread: jest.fn(() => true),
        sendTyping: jest.fn().mockResolvedValue(undefined),
      },
      channelId: 'thread456',
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      content: 'User message',
      reply: jest.fn().mockResolvedValue(undefined),
    };

    const executePromise = messageCreate.execute(message);

    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('Bot response'));
    mockProcess.emit('close', 0);

    await executePromise;

    expect(mockConversationManager.addMessages).toHaveBeenCalledWith('thread456', [
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'Bot response' },
    ]);
  });

  test('messageCreate handles python script errors', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);
    mockConversationManager.hasHistory.mockReturnValue(true);
    mockConversationManager.getHistory.mockReturnValue([]);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: false,
      },
      channel: {
        isThread: jest.fn(() => true),
        sendTyping: jest.fn().mockResolvedValue(undefined),
      },
      channelId: 'thread789',
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      content: 'Test message',
      reply: jest.fn().mockResolvedValue(undefined),
    };

    const executePromise = messageCreate.execute(message);

    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stderr.emit('data', Buffer.from('Python error'));
    mockProcess.emit('close', 1);

    await executePromise;

    expect(message.reply).toHaveBeenCalledWith('Sorry, something went wrong with the AI script.');
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('messageCreate splits long responses into multiple messages', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);
    mockConversationManager.hasHistory.mockReturnValue(true);
    mockConversationManager.getHistory.mockReturnValue([]);

    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: false,
      },
      channel: {
        isThread: jest.fn(() => true),
        sendTyping: jest.fn().mockResolvedValue(undefined),
        send: jest.fn().mockResolvedValue(undefined),
      },
      channelId: 'thread999',
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      content: 'Test',
      reply: jest.fn().mockResolvedValue(undefined),
    };

    const executePromise = messageCreate.execute(message);

    await new Promise(resolve => setImmediate(resolve));

    // Create a response longer than 2000 characters
    const longResponse = 'a'.repeat(2500);
    mockProcess.stdout.emit('data', Buffer.from(longResponse));
    mockProcess.emit('close', 0);

    await executePromise;

    // Should call reply once with first 2000 chars
    expect(message.reply).toHaveBeenCalledWith('a'.repeat(2000));
    // Then send once with remaining 500 chars
    expect(message.channel.send).toHaveBeenCalledWith('a'.repeat(500));
  });

  test('messageCreate handles empty output', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);
    mockConversationManager.hasHistory.mockReturnValue(true);
    mockConversationManager.getHistory.mockReturnValue([]);

    const messageCreate = require('../../src/events/messageCreate');
    
    const message = {
      author: {
        bot: false,
      },
      channel: {
        isThread: jest.fn(() => true),
        sendTyping: jest.fn().mockResolvedValue(undefined),
      },
      channelId: 'thread000',
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      content: 'Test',
      reply: jest.fn().mockResolvedValue(undefined),
    };

    const executePromise = messageCreate.execute(message);

    await new Promise(resolve => setImmediate(resolve));

    // No stdout data
    mockProcess.emit('close', 0);

    await executePromise;

    expect(message.reply).toHaveBeenCalledWith('No response received.');
  });
});
