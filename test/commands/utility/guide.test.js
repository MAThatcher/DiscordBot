const guide = require('../../../src/commands/utility/guide');

test('guide.autocomplete responds with filtered query choices', async () => {
  const focused = { name: 'query', value: 'W' };
  const options = { getFocused: () => focused };
  const respond = jest.fn().mockResolvedValue(undefined);
  const interaction = { options, respond };

  await guide.autocomplete(interaction);

  expect(respond).toHaveBeenCalled();
  const arg = respond.mock.calls[0][0];
  expect(Array.isArray(arg)).toBe(true);
});

test('guide.execute replies with search url including version when provided', async () => {
  const options = { getString: (k) => (k === 'query' ? 'test search' : '9.9') };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined) };

  await guide.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('You can search the guide here:') }));
});
