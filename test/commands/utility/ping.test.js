const pingCommand = require('../../../src/commands/utility/ping');

test('ping.execute replies with Pong!', async () => {
    const interaction = { reply: jest.fn().mockResolvedValue(undefined) };
    await pingCommand.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith('Pong!');
});
