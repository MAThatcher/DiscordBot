const reload = require('../../../src/commands/utility/reload');

test('reload.execute replies when command not found', async () => {
  const options = { getString: (k) => 'nope' };
  const client = { commands: new Map() };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined), client };

  await reload.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith("There is no command with name `nope`!");
});

test('reload.execute successfully reloads an existing command', async () => {
  const options = { getString: (k) => 'ping' };
  const mockCommand = { data: { name: 'ping' } };
  const commands = new Map([['ping', mockCommand]]);
  const client = { commands };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined), client };

  await reload.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith('Command `ping` was reloaded!');
});
