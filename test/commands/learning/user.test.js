const userCmd = require('../../../src/commands/learning/user');

test('user.execute replies with user info', async () => {
  const interaction = {
    reply: jest.fn().mockResolvedValue(undefined),
    user: { username: 'alice' },
    member: { joinedAt: '2020-01-01' },
  };

  await userCmd.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith('This command was run by alice, who joined on 2020-01-01.');
});
