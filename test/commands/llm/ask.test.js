const { EventEmitter } = require('events');

let mockSpawn;

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  const { spawn } = require('child_process');
  mockSpawn = spawn;
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
      ephemeral: true,
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
      expect.stringContaining('ollama_cli.py'),
      'What is the meaning of life?',
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
});
