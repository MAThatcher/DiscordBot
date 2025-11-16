const handler = require('../../src/events/interactionCreate');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  // flush and restore timers to avoid open handles from setTimeout in the handler
  try {
    jest.runOnlyPendingTimers();
  } catch (e) {}
  jest.useRealTimers();
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

test('calls command.execute for chat input commands', async () => {
  const mockExecute = jest.fn().mockResolvedValue(undefined);
  const command = { execute: mockExecute, data: { name: 'cmd' } };
  const client = { commands: new Map([['cmd', command]]), cooldowns: new Map() };

  const interaction = {
    isChatInputCommand: () => true,
    commandName: 'cmd',
    client,
    user: { id: 'user-1' },
  };

  await handler.execute(interaction);

  expect(mockExecute).toHaveBeenCalledWith(interaction);
});

test('on execute error uses followUp when already replied', async () => {
  const mockExecute = jest.fn().mockRejectedValue(new Error('fail'));
  const command = { execute: mockExecute, data: { name: 'cmd' } };
  const client = { commands: new Map([['cmd', command]]), cooldowns: new Map() };

  const interaction = {
    isChatInputCommand: () => true,
    commandName: 'cmd',
    client,
    user: { id: 'user-1' },
    replied: true,
    followUp: jest.fn().mockResolvedValue(undefined),
  };

  jest.spyOn(console, 'error').mockImplementation(() => {});

  await handler.execute(interaction);

  expect(interaction.followUp).toHaveBeenCalledWith({
    content: 'There was an error while executing this command!',
    flags: expect.any(Number),
  });
});

test('returns early and logs when command not found', async () => {
  const client = { commands: new Map(), cooldowns: new Map() };
  const interaction = {
    isChatInputCommand: () => true,
    commandName: 'nope',
    client,
  };

  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await handler.execute(interaction);

  expect(errSpy).toHaveBeenCalledWith(`No command matching ${interaction.commandName} was found.`);

  errSpy.mockRestore();
});

test('replies with cooldown message when user is still on cooldown', async () => {
  const mockExecute = jest.fn().mockResolvedValue(undefined);
  const command = { execute: mockExecute, data: { name: 'cmd' } };
  const timestampsMap = new Map();
  const userId = 'u1';
  // set an expiration in the future
  timestampsMap.set(userId, Date.now() + 5_000);
  const cooldowns = new Map([[command.data.name, timestampsMap]]);

  const client = { commands: new Map([['cmd', command]]), cooldowns };

  const interaction = {
    isChatInputCommand: () => true,
    commandName: 'cmd',
    client,
    user: { id: userId },
    reply: jest.fn().mockResolvedValue(undefined),
  };

  await handler.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('Please wait, you are on a cooldown for `cmd`') }));
});

test('calls command.autocomplete for autocomplete interactions', async () => {
  const mockAuto = jest.fn().mockResolvedValue(undefined);
  const command = { autocomplete: mockAuto };
  const client = { commands: new Map([['cmd', command]]) };

  const interaction = {
    isChatInputCommand: () => false,
    isAutocomplete: () => true,
    commandName: 'cmd',
    client,
  };

  await handler.execute(interaction);

  expect(mockAuto).toHaveBeenCalledWith(interaction);
});

test('logs error when autocomplete command not found', async () => {
  const client = { commands: new Map() };
  const interaction = {
    isChatInputCommand: () => false,
    isAutocomplete: () => true,
    commandName: 'nope',
    client,
  };

  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await handler.execute(interaction);

  expect(errSpy).toHaveBeenCalledWith(`No command matching ${interaction.commandName} was found.`);

  errSpy.mockRestore();
});
