const info = require('../../../src/commands/learning/info');

test('info.execute handles user subcommand', async () => {
  const user = { globalName: 'bob', id: '123' };
  const options = { getSubcommand: () => 'user', getUser: () => user };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined), user };

  await info.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith('User info for bob (ID: 123)');
});

test('info.execute handles server subcommand', async () => {
  const guild = { name: 'G', id: 'g1' };
  const options = { getSubcommand: () => 'server' };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined), guild };

  await info.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith('Server info for G (ID: g1)');
});
