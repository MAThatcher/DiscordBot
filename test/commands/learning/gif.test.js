const gif = require('../../../src/commands/learning/gif');

test('gif.execute replies with Pong!', async () => {
  const interaction = { reply: jest.fn().mockResolvedValue(undefined) };
  await gif.execute(interaction);
  expect(interaction.reply).toHaveBeenCalledWith('Pong!');
});
