const cupid = require('../../../src/commands/learning/cupid');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('cupid.execute replies then edits reply with chosen lover', async () => {
  const lover = { user: { id: '555' } };
  const members = { random: jest.fn().mockReturnValue(lover) };
  const cache = { filter: jest.fn().mockReturnValue(members) };
  const guild = { members: { cache } };

  const interaction = {
    reply: jest.fn().mockResolvedValue(undefined),
    editReply: jest.fn().mockResolvedValue(undefined),
    guild,
    user: { id: '999' },
  };

  await cupid.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith('Finding out who loves you the most... ❤️');

  jest.runAllTimers();

  expect(interaction.editReply).toHaveBeenCalledWith(`<@${lover.user.id}> loves you the most! ❤️`);
});
