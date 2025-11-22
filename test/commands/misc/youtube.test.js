const youtubedl = require('youtube-dl-exec');
const { AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { EventEmitter } = require('events');
const { spawn } = require('child_process');

jest.mock('youtube-dl-exec');
jest.mock('child_process');
jest.mock('@discordjs/voice', () => {
    const EventEmitter = require('events');
    
    class MockAudioPlayer extends EventEmitter {
        play = jest.fn();
    }
    
    class MockVoiceConnection extends EventEmitter {
        subscribe = jest.fn();
        destroy = jest.fn();
    }
    
    return {
        joinVoiceChannel: jest.fn(),
        createAudioPlayer: jest.fn(),
        createAudioResource: jest.fn(),
        getVoiceConnection: jest.fn(),
        AudioPlayerStatus: {
            Idle: 'idle',
            Playing: 'playing',
            Paused: 'paused',
        },
        VoiceConnectionStatus: {
            Connected: 'connected',
            Disconnected: 'disconnected',
        },
        StreamType: {
            Arbitrary: 'arbitrary',
        },
        MockAudioPlayer,
        MockVoiceConnection,
    };
});

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('youtube command', () => {
    test('youtube command has correct data structure', () => {
        const youtube = require('../../../src/commands/misc/youtube');
        
        expect(youtube.data).toBeDefined();
        expect(youtube.data.name).toBe('youtube');
        expect(youtube.data.description).toBe('YouTube audio playback controls');
    });

    test('youtube.execute requires user to be in voice channel for play subcommand', async () => {
        const youtube = require('../../../src/commands/misc/youtube');
        
        const interaction = {
            member: {
                voice: {},
            },
            options: {
                getSubcommand: jest.fn(() => 'play'),
                getString: jest.fn(() => 'https://www.youtube.com/watch?v=test'),
            },
            reply: jest.fn().mockResolvedValue(undefined),
        };

        await youtube.execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'You need to be in a voice channel to use this command!',
            ephemeral: true,
        });
    });

    test('youtube.execute stop subcommand when not playing', async () => {
        const { getVoiceConnection } = require('@discordjs/voice');
        getVoiceConnection.mockReturnValue(null);

        const youtube = require('../../../src/commands/misc/youtube');
        
        const interaction = {
            guild: { id: 'guild123' },
            options: {
                getSubcommand: jest.fn(() => 'stop'),
            },
            reply: jest.fn().mockResolvedValue(undefined),
        };

        await youtube.execute(interaction);

        expect(getVoiceConnection).toHaveBeenCalledWith('guild123');
        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'I\'m not playing anything right now!',
            ephemeral: true,
        });
    });

    test('youtube.execute stop subcommand destroys connection', async () => {
        const { getVoiceConnection } = require('@discordjs/voice');
        const mockConnection = { destroy: jest.fn() };
        getVoiceConnection.mockReturnValue(mockConnection);

        const youtube = require('../../../src/commands/misc/youtube');
        
        const interaction = {
            guild: { id: 'guild123' },
            options: {
                getSubcommand: jest.fn(() => 'stop'),
            },
            reply: jest.fn().mockResolvedValue(undefined),
        };

        await youtube.execute(interaction);

        expect(mockConnection.destroy).toHaveBeenCalled();
        expect(interaction.reply).toHaveBeenCalledWith('⏹️ Stopped playback and disconnected.');
    });

    test('youtube.execute plays audio from valid YouTube URL', async () => {
        const { joinVoiceChannel, createAudioPlayer, createAudioResource, MockAudioPlayer, MockVoiceConnection } = require('@discordjs/voice');
        
        youtubedl.mockResolvedValue({
            title: 'Test Video Title',
            formats: [
                { acodec: 'opus', vcodec: 'none', url: 'https://test.url/audio' }
            ],
        });

        const mockStdout = new EventEmitter();
        const mockProcess = {
            stdout: mockStdout,
            stderr: new EventEmitter(),
        };
        spawn.mockReturnValue(mockProcess);

        const mockPlayer = new MockAudioPlayer();
        const mockConnection = new MockVoiceConnection();
        
        createAudioPlayer.mockReturnValue(mockPlayer);
        joinVoiceChannel.mockReturnValue(mockConnection);
        createAudioResource.mockReturnValue({ stream: mockStdout });

        const youtube = require('../../../src/commands/misc/youtube');
        
        const interaction = {
            member: {
                voice: {
                    channel: { id: 'voice123', name: 'Voice Channel' },
                },
            },
            guild: {
                id: 'guild123',
                voiceAdapterCreator: jest.fn(),
            },
            options: {
                getSubcommand: jest.fn(() => 'play'),
                getString: jest.fn(() => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
            },
            deferReply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
        };

        await youtube.execute(interaction);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(youtubedl).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ', expect.any(Object));
        expect(spawn).toHaveBeenCalled();
        expect(joinVoiceChannel).toHaveBeenCalledWith({
            channelId: 'voice123',
            guildId: 'guild123',
            adapterCreator: expect.any(Function),
        });
        expect(mockPlayer.play).toHaveBeenCalled();
        expect(mockConnection.subscribe).toHaveBeenCalledWith(mockPlayer);
        expect(interaction.editReply).toHaveBeenCalledWith('🎵 Now playing: **Test Video Title**');
    });

    test('youtube.execute destroys connection when player becomes idle', async () => {
        const { joinVoiceChannel, createAudioPlayer, createAudioResource, MockAudioPlayer, MockVoiceConnection } = require('@discordjs/voice');
        
        youtubedl.mockResolvedValue({
            title: 'Test Video',
            formats: [{ acodec: 'opus', vcodec: 'none', url: 'https://test.url/audio' }],
        });

        const mockStdout = new EventEmitter();
        spawn.mockReturnValue({ stdout: mockStdout, stderr: new EventEmitter() });

        const mockPlayer = new MockAudioPlayer();
        const mockConnection = new MockVoiceConnection();
        
        createAudioPlayer.mockReturnValue(mockPlayer);
        joinVoiceChannel.mockReturnValue(mockConnection);
        createAudioResource.mockReturnValue({ stream: mockStdout });

        const youtube = require('../../../src/commands/misc/youtube');
        
        const interaction = {
            member: {
                voice: {
                    channel: { id: 'voice123' },
                },
            },
            guild: {
                id: 'guild123',
                voiceAdapterCreator: jest.fn(),
            },
            options: {
                getSubcommand: jest.fn(() => 'play'),
                getString: jest.fn(() => 'https://www.youtube.com/watch?v=test'),
            },
            deferReply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
        };

        await youtube.execute(interaction);

        // Simulate player becoming idle
        mockPlayer.emit(AudioPlayerStatus.Idle);

        expect(mockConnection.destroy).toHaveBeenCalled();
    });

    test('youtube.execute handles player errors', async () => {
        const { joinVoiceChannel, createAudioPlayer, createAudioResource, MockAudioPlayer, MockVoiceConnection } = require('@discordjs/voice');
        
        youtubedl.mockResolvedValue({
            title: 'Test Video',
            formats: [{ acodec: 'opus', vcodec: 'none', url: 'https://test.url/audio' }],
        });

        const mockStdout = new EventEmitter();
        spawn.mockReturnValue({ stdout: mockStdout, stderr: new EventEmitter() });

        const mockPlayer = new MockAudioPlayer();
        const mockConnection = new MockVoiceConnection();
        
        createAudioPlayer.mockReturnValue(mockPlayer);
        joinVoiceChannel.mockReturnValue(mockConnection);
        createAudioResource.mockReturnValue({ stream: mockStdout });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const youtube = require('../../../src/commands/misc/youtube');
        
        const interaction = {
            member: {
                voice: {
                    channel: { id: 'voice123' },
                },
            },
            guild: {
                id: 'guild123',
                voiceAdapterCreator: jest.fn(),
            },
            options: {
                getSubcommand: jest.fn(() => 'play'),
                getString: jest.fn(() => 'https://www.youtube.com/watch?v=test'),
            },
            deferReply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
            followUp: jest.fn().mockResolvedValue(undefined),
        };

        await youtube.execute(interaction);

        // Simulate player error
        const testError = new Error('Playback error');
        mockPlayer.emit('error', testError);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Audio player error:', testError);
        expect(mockConnection.destroy).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: 'An error occurred while playing the audio.',
            ephemeral: true,
        });

        consoleErrorSpy.mockRestore();
    });

    test('youtube.execute handles disconnection', async () => {
        const { joinVoiceChannel, createAudioPlayer, createAudioResource, MockAudioPlayer, MockVoiceConnection } = require('@discordjs/voice');
        
        youtubedl.mockResolvedValue({
            title: 'Test Video',
            formats: [{ acodec: 'opus', vcodec: 'none', url: 'https://test.url/audio' }],
        });

        const mockStdout = new EventEmitter();
        spawn.mockReturnValue({ stdout: mockStdout, stderr: new EventEmitter() });

        const mockPlayer = new MockAudioPlayer();
        const mockConnection = new MockVoiceConnection();
        
        createAudioPlayer.mockReturnValue(mockPlayer);
        joinVoiceChannel.mockReturnValue(mockConnection);
        createAudioResource.mockReturnValue({ stream: mockStdout });

        const youtube = require('../../../src/commands/misc/youtube');
        
        const interaction = {
            member: {
                voice: {
                    channel: { id: 'voice123' },
                },
            },
            guild: {
                id: 'guild123',
                voiceAdapterCreator: jest.fn(),
            },
            options: {
                getSubcommand: jest.fn(() => 'play'),
                getString: jest.fn(() => 'https://www.youtube.com/watch?v=test'),
            },
            deferReply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
        };

        await youtube.execute(interaction);

        // Simulate disconnection
        mockConnection.emit(VoiceConnectionStatus.Disconnected);

        expect(mockConnection.destroy).toHaveBeenCalled();
    });

    test('youtube.execute handles youtubedl errors', async () => {
        youtubedl.mockRejectedValue(new Error('Video not available'));

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const youtube = require('../../../src/commands/misc/youtube');
        
        const interaction = {
            member: {
                voice: {
                    channel: { id: 'voice123' },
                },
            },
            guild: {
                id: 'guild123',
                voiceAdapterCreator: jest.fn(),
            },
            options: {
                getSubcommand: jest.fn(() => 'play'),
                getString: jest.fn(() => 'https://www.youtube.com/watch?v=invalid'),
            },
            deferReply: jest.fn().mockResolvedValue(undefined),
            editReply: jest.fn().mockResolvedValue(undefined),
        };

        await youtube.execute(interaction);

        expect(consoleErrorSpy).toHaveBeenCalledWith('YouTube command error:', expect.any(Error));
        expect(interaction.editReply).toHaveBeenCalledWith(
            'Failed to play the video. Please make sure the URL is valid and the video is available.'
        );

        consoleErrorSpy.mockRestore();
    });
});
