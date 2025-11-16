const gif = require('../../../src/commands/fun/gif');

test('gif.execute replies with Pong!', async () => {
  const interaction = { reply: jest.fn().mockResolvedValue(undefined) };
  await gif.execute(interaction);
  expect(interaction.reply).toHaveBeenCalledWith('Pong!');
});
