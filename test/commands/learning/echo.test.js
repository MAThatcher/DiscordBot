const echo = require('../../../src/commands/learning/echo');

test('echo.execute replies with provided input', async () => {
  const options = { getString: () => 'hello world', getBoolean: () => true };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined) };

  await echo.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'hello world' }));
});
