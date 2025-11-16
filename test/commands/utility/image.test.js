const image = require('../../../src/commands/utility/image');

test('image.execute replies with an attachment when images exist', async () => {
  const options = { getString: () => null };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined) };

  await image.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('Here you go'), files: expect.any(Array) }));
});
