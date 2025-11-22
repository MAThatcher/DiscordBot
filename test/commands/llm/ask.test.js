const { EventEmitter } = require('events');

let mockSpawn;
let mockConversationManager;

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('../../../src/utils/conversationManager', () => ({
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
  mockConversationManager = require('../../../src/utils/conversationManager');
  mockConversationManager.getHistory.mockReturnValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ask command', () => {
  test('ask.execute requires Vibe Prompter role', async () => {
    const ask = require('../../../src/commands/llm/ask');
    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn(() => false),
          },
        },
      },
      reply: jest.fn().mockResolvedValue(undefined),
    };

    await ask.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'You do not have permission to use this command. You need the Vibe Prompter Role',
      flags: 64, // MessageFlags.Ephemeral
    });
  });

  test('ask.execute defers reply and spawns python process', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockReply = {
      startThread: jest.fn().mockResolvedValue({
        send: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'What is the meaning of life?'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(mockReply),
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    const executePromise = ask.execute(interaction);

    // Wait for event listeners to be set up
    await new Promise(resolve => setImmediate(resolve));

    // Simulate successful python execution
    mockProcess.stdout.emit('data', Buffer.from('42'));
    mockProcess.emit('close', 0);

    await executePromise;

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalledWith('python3', expect.arrayContaining([
      expect.stringContaining('ollama_cli'),
      'What is the meaning of life?',
      '[]', // Empty history for new thread
    ]));
    expect(interaction.editReply).toHaveBeenCalledWith('**Question:** What is the meaning of life?');
  });

  test('ask.execute handles python script error', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'test prompt'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const executePromise = ask.execute(interaction);

    // Wait for event listeners to be set up
    await new Promise(resolve => setImmediate(resolve));

    // Simulate python error
    mockProcess.stderr.emit('data', Buffer.from('Python error occurred'));
    mockProcess.emit('close', 1);

    await executePromise;

    expect(interaction.editReply).toHaveBeenCalledWith('Sorry, something went wrong with the AI script.');
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  test('ask.execute creates thread and sends response', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockThread = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const mockReply = {
      startThread: jest.fn().mockResolvedValue(mockThread),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'Short prompt'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(mockReply),
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    const executePromise = ask.execute(interaction);

    // Wait for event listeners to be set up
    await new Promise(resolve => setImmediate(resolve));

    // Simulate AI response
    mockProcess.stdout.emit('data', Buffer.from('This is the AI response.'));
    mockProcess.emit('close', 0);

    await executePromise;
    
    // Wait for async operations to complete
    await new Promise(resolve => setImmediate(resolve));

    expect(mockReply.startThread).toHaveBeenCalledWith({
      name: 'AI Response: Short prompt',
      autoArchiveDuration: 60,
    });
    expect(mockThread.send).toHaveBeenCalledWith('This is the AI response.');
  });

  test('ask.execute uses existing thread if in thread', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockChannel = {
      isThread: jest.fn(() => true),
      send: jest.fn().mockResolvedValue(undefined),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'test prompt'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue({}),
      channel: mockChannel,
    };

    const executePromise = ask.execute(interaction);

    // Wait for event listeners to be set up
    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('Response'));
    mockProcess.emit('close', 0);

    await executePromise;

    expect(mockChannel.send).toHaveBeenCalledWith('Response');
  });

  test('ask.execute splits long responses into multiple messages', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockThread = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const mockReply = {
      startThread: jest.fn().mockResolvedValue(mockThread),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'prompt'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(mockReply),
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    const executePromise = ask.execute(interaction);

    // Wait for event listeners to be set up
    await new Promise(resolve => setImmediate(resolve));

    // Create a response longer than 2000 characters
    const longResponse = 'a'.repeat(2500);
    mockProcess.stdout.emit('data', Buffer.from(longResponse));
    mockProcess.emit('close', 0);

    await executePromise;
    
    // Wait for async operations to complete
    await new Promise(resolve => setImmediate(resolve));

    // Should send 2 messages: first 2000 chars, then remaining 500
    expect(mockThread.send).toHaveBeenCalledTimes(2);
    expect(mockThread.send).toHaveBeenNthCalledWith(1, 'a'.repeat(2000));
    expect(mockThread.send).toHaveBeenNthCalledWith(2, 'a'.repeat(500));
  });

  test('ask.execute handles empty output', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockThread = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const mockReply = {
      startThread: jest.fn().mockResolvedValue(mockThread),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'prompt'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(mockReply),
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    const executePromise = ask.execute(interaction);

    // Wait for event listeners to be set up
    await new Promise(resolve => setImmediate(resolve));

    // No stdout data
    mockProcess.emit('close', 0);

    await executePromise;
    
    // Wait for async operations to complete
    await new Promise(resolve => setImmediate(resolve));

    expect(mockThread.send).toHaveBeenCalledWith('No response received.');
  });

  test('ask.execute truncates long thread names', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockThread = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const mockReply = {
      startThread: jest.fn().mockResolvedValue(mockThread),
    };

    const longPrompt = 'a'.repeat(100);

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => longPrompt),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(mockReply),
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    const executePromise = ask.execute(interaction);

    // Wait for event listeners to be set up
    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('Response'));
    mockProcess.emit('close', 0);

    await executePromise;

    expect(mockReply.startThread).toHaveBeenCalledWith({
      name: `AI Response: ${'a'.repeat(80)}...`,
      autoArchiveDuration: 60,
    });
  });

  test('ask command has correct data structure', () => {
    const ask = require('../../../src/commands/llm/ask');
    
    expect(ask.data).toBeDefined();
    expect(ask.data.name).toBe('ask');
    expect(ask.data.description).toBe('Ask the AI a question (via Python script)');
  });

  test('ask.execute passes conversation history to python script', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const existingHistory = [
      { role: 'user', content: 'Previous question' },
      { role: 'assistant', content: 'Previous answer' },
    ];
    mockConversationManager.getHistory.mockReturnValue(existingHistory);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockChannel = {
      isThread: jest.fn(() => true),
      send: jest.fn().mockResolvedValue(undefined),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'Follow-up question'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue({}),
      channel: mockChannel,
      channelId: 'thread123',
    };

    const executePromise = ask.execute(interaction);

    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('Follow-up answer'));
    mockProcess.emit('close', 0);

    await executePromise;

    expect(mockConversationManager.getHistory).toHaveBeenCalledWith('thread123');
    expect(mockSpawn).toHaveBeenCalledWith('python3', [
      expect.stringContaining('ollama_cli'),
      'Follow-up question',
      JSON.stringify(existingHistory),
    ]);
  });

  test('ask.execute updates conversation history after response', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockThread = {
      send: jest.fn().mockResolvedValue(undefined),
      id: 'newThread123',
    };

    const mockReply = {
      startThread: jest.fn().mockResolvedValue(mockThread),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'New question'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(mockReply),
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    const executePromise = ask.execute(interaction);

    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('AI response'));
    mockProcess.emit('close', 0);

    await executePromise;
    await new Promise(resolve => setImmediate(resolve));

    expect(mockConversationManager.addMessages).toHaveBeenCalledWith('newThread123', [
      { role: 'user', content: 'New question' },
      { role: 'assistant', content: 'AI response' },
    ]);
  });

  test('ask.execute clears history when clear option is true', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockChannel = {
      isThread: jest.fn(() => true),
      send: jest.fn().mockResolvedValue(undefined),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'New topic'),
        getBoolean: jest.fn(() => true), // clear = true
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue({}),
      channel: mockChannel,
      channelId: 'thread123',
    };

    const executePromise = ask.execute(interaction);

    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('Response'));
    mockProcess.emit('close', 0);

    await executePromise;

    expect(mockConversationManager.clearHistory).toHaveBeenCalledWith('thread123');
    expect(interaction.editReply).toHaveBeenCalledWith('✅ Conversation history cleared. Now processing your question...');
  });

  test('ask.execute does not clear history when clear option is false', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockChannel = {
      isThread: jest.fn(() => true),
      send: jest.fn().mockResolvedValue(undefined),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'Question'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue({}),
      channel: mockChannel,
      channelId: 'thread123',
    };

    const executePromise = ask.execute(interaction);

    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('Response'));
    mockProcess.emit('close', 0);

    await executePromise;

    expect(mockConversationManager.clearHistory).not.toHaveBeenCalled();
  });

  test('ask.execute handles new thread without existing history', async () => {
    const mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValue(mockProcess);
    mockConversationManager.getHistory.mockReturnValue([]);

    const ask = require('../../../src/commands/llm/ask');
    
    const mockThread = {
      send: jest.fn().mockResolvedValue(undefined),
      id: 'newThread456',
    };

    const mockReply = {
      startThread: jest.fn().mockResolvedValue(mockThread),
    };

    const interaction = {
      member: {
        roles: {
          cache: {
            some: jest.fn((cb) => cb({ name: 'Vibe Prompter' })),
          },
        },
      },
      options: {
        getString: jest.fn(() => 'First question'),
        getBoolean: jest.fn(() => false),
      },
      deferReply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(mockReply),
      channel: {
        isThread: jest.fn(() => false),
      },
    };

    const executePromise = ask.execute(interaction);

    await new Promise(resolve => setImmediate(resolve));

    mockProcess.stdout.emit('data', Buffer.from('First answer'));
    mockProcess.emit('close', 0);

    await executePromise;
    await new Promise(resolve => setImmediate(resolve));

    expect(mockSpawn).toHaveBeenCalledWith('python3', [
      expect.stringContaining('ollama_cli'),
      'First question',
      '[]', // Empty history for new thread
    ]);
  });
});
