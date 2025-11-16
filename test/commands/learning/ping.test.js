const pingCommand = require('../../../src/commands/learning/ping');

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

test('ping.execute defers then edits reply with Pong!', async () => {
        const interaction = { deferReply: jest.fn().mockResolvedValue(undefined), editReply: jest.fn().mockResolvedValue(undefined) };
        await pingCommand.execute(interaction);

        expect(interaction.deferReply).toHaveBeenCalledWith({ flags: expect.any(Number) });

        jest.runAllTimers();

        expect(interaction.editReply).toHaveBeenCalledWith('Pong!');
});
