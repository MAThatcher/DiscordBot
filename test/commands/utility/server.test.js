const server = require('../../../src/commands/utility/server');

test('server.execute replies with server info', async () => {
  const guild = { name: 'MyServer', memberCount: 42 };
  const interaction = { reply: jest.fn().mockResolvedValue(undefined), guild };

  await server.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith('This server is MyServer and has 42 members.');
});
