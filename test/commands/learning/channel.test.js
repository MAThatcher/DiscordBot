const { MessageFlags } = require('discord.js');
const channel = require('../../../src/commands/learning/channel');

describe('Channel Command', () => {
    let mockInteraction;

    beforeEach(() => {
        mockInteraction = {
            channelId: '1439700274762743951',
            reply: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should have correct command data', () => {
        expect(channel.data.name).toBe('test');
        expect(channel.data.description).toBe('this is a channel specific command');
    });

    test('should reply with correct message in the correct channel', async () => {
        mockInteraction.channelId = '1439700274762743951';
        await channel.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: 'this is the correct channel!',
            flags: MessageFlags.Ephemeral,
        });
    });

    test('should reply with wrong channel message in incorrect channel', async () => {
        mockInteraction.channelId = '1434926413542195220';
        await channel.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: 'This is the wrong channel for this command.',
            flags: MessageFlags.Ephemeral,
        });
    });

    test('should reply with wrong channel message for any other channel', async () => {
        mockInteraction.channelId = '9999999999999999999';
        await channel.execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: 'This is the wrong channel for this command.',
            flags: MessageFlags.Ephemeral,
        });
    });
});
