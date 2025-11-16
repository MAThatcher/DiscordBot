const handler = require('../../src/events/interactionCreate');

test('calls command.execute for chat input commands', async () => {
  const mockExecute = jest.fn().mockResolvedValue(undefined);
  const command = { execute: mockExecute };
  const client = { commands: new Map([['cmd', command]]) };

  const interaction = {
    isChatInputCommand: () => true,
    commandName: 'cmd',
    client,
  };

  await handler.execute(interaction);

  expect(mockExecute).toHaveBeenCalledWith(interaction);
});

test('on execute error uses followUp when already replied', async () => {
  const mockExecute = jest.fn().mockRejectedValue(new Error('fail'));
  const command = { execute: mockExecute };
  const client = { commands: new Map([['cmd', command]]) };

  const interaction = {
    isChatInputCommand: () => true,
    commandName: 'cmd',
    client,
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
