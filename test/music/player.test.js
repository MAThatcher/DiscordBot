describe('player', () => {
  let player, initPlayer, connectToVoice, destroyConnection, setCurrentResource, setVolume, getVolume;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('initPlayer creates new player on first call', () => {
    const mockPlayer = {
      on: jest.fn(),
    };
    const createAudioPlayer = jest.fn(() => mockPlayer);
    const AudioPlayerStatus = { Idle: 'idle' };

    jest.doMock('@discordjs/voice', () => ({
      createAudioPlayer,
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus,
    }));

    ({ initPlayer } = require('../../src/music/player'));

    const onIdle = jest.fn();
    const result = initPlayer(onIdle);

    expect(createAudioPlayer).toHaveBeenCalledWith({
      behaviors: { noSubscriber: 'pause' }
    });
    expect(mockPlayer.on).toHaveBeenCalledWith('idle', onIdle);
    expect(mockPlayer.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(result).toBe(mockPlayer);
  });

  test('initPlayer returns existing player on subsequent calls', () => {
    const mockPlayer = {
      on: jest.fn(),
    };
    const createAudioPlayer = jest.fn(() => mockPlayer);
    const AudioPlayerStatus = { Idle: 'idle' };

    jest.doMock('@discordjs/voice', () => ({
      createAudioPlayer,
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus,
    }));

    ({ initPlayer } = require('../../src/music/player'));

    const onIdle1 = jest.fn();
    const onIdle2 = jest.fn();
    
    initPlayer(onIdle1);
    const result = initPlayer(onIdle2);

    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockPlayer);
  });

  test('player error handler calls onIdle', () => {
    const mockPlayer = {
      on: jest.fn(),
    };
    const createAudioPlayer = jest.fn(() => mockPlayer);
    const AudioPlayerStatus = { Idle: 'idle' };
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    jest.doMock('@discordjs/voice', () => ({
      createAudioPlayer,
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus,
    }));

    ({ initPlayer } = require('../../src/music/player'));

    const onIdle = jest.fn();
    initPlayer(onIdle);

    const errorHandler = mockPlayer.on.mock.calls.find(call => call[0] === 'error')[1];
    const testError = new Error('test error');
    
    errorHandler(testError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Audio player error:', testError);
    expect(onIdle).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  test('connectToVoice creates new connection and subscribes player', () => {
    const mockPlayer = { on: jest.fn() };
    const mockConnection = { subscribe: jest.fn() };
    const joinVoiceChannel = jest.fn(() => mockConnection);
    const createAudioPlayer = jest.fn(() => mockPlayer);

    jest.doMock('@discordjs/voice', () => ({
      joinVoiceChannel,
      createAudioPlayer,
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus: { Idle: 'idle' },
    }));

    ({ connectToVoice, initPlayer } = require('../../src/music/player'));

    // Initialize player first
    initPlayer(jest.fn());

    const voiceChannel = {
      id: 'channel-123',
      guild: {
        id: 'guild-456',
        voiceAdapterCreator: {}
      }
    };

    const result = connectToVoice(voiceChannel);

    expect(joinVoiceChannel).toHaveBeenCalledWith({
      channelId: 'channel-123',
      guildId: 'guild-456',
      adapterCreator: {}
    });
    expect(mockConnection.subscribe).toHaveBeenCalledWith(mockPlayer);
    expect(result).toBe(mockConnection);
  });

  test('connectToVoice returns existing connection', () => {
    const mockPlayer = { on: jest.fn() };
    const mockConnection = { subscribe: jest.fn() };
    const joinVoiceChannel = jest.fn(() => mockConnection);
    const createAudioPlayer = jest.fn(() => mockPlayer);

    jest.doMock('@discordjs/voice', () => ({
      joinVoiceChannel,
      createAudioPlayer,
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus: { Idle: 'idle' },
    }));

    ({ connectToVoice, initPlayer } = require('../../src/music/player'));

    // Initialize player first
    initPlayer(jest.fn());

    const voiceChannel = {
      id: 'channel-123',
      guild: { id: 'guild-456', voiceAdapterCreator: {} }
    };

    connectToVoice(voiceChannel);
    const result = connectToVoice(voiceChannel);

    expect(joinVoiceChannel).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockConnection);
  });

  test('setCurrentResource updates resource and sets volume', () => {
    jest.doMock('@discordjs/voice', () => ({
      createAudioPlayer: jest.fn(() => ({ on: jest.fn() })),
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus: { Idle: 'idle' },
    }));

    ({ setCurrentResource, getVolume } = require('../../src/music/player'));

    const mockResource = {
      volume: { setVolume: jest.fn() }
    };

    setCurrentResource(mockResource);

    expect(mockResource.volume.setVolume).toHaveBeenCalledWith(0.75);
  });

  test('setVolume updates volume level and current resource', () => {
    jest.doMock('@discordjs/voice', () => ({
      createAudioPlayer: jest.fn(() => ({ on: jest.fn() })),
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus: { Idle: 'idle' },
    }));

    ({ setCurrentResource, setVolume, getVolume } = require('../../src/music/player'));

    const mockResource = {
      volume: { setVolume: jest.fn() }
    };

    setCurrentResource(mockResource);
    setVolume(0.5);

    expect(getVolume()).toBe(0.5);
    expect(mockResource.volume.setVolume).toHaveBeenCalledWith(0.5);
  });

  test('destroyConnection destroys connection when it exists', () => {
    const mockPlayer = { on: jest.fn() };
    const mockConnection = { subscribe: jest.fn(), destroy: jest.fn() };
    const joinVoiceChannel = jest.fn(() => mockConnection);

    jest.doMock('@discordjs/voice', () => ({
      joinVoiceChannel,
      createAudioPlayer: jest.fn(() => mockPlayer),
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus: { Idle: 'idle' },
    }));

    ({ connectToVoice, destroyConnection } = require('../../src/music/player'));

    const voiceChannel = {
      id: 'channel-123',
      guild: { id: 'guild-456', voiceAdapterCreator: {} }
    };

    connectToVoice(voiceChannel);
    destroyConnection();

    expect(mockConnection.destroy).toHaveBeenCalled();
  });

  test('destroyConnection does nothing when no connection exists', () => {
    jest.doMock('@discordjs/voice', () => ({
      createAudioPlayer: jest.fn(() => ({ on: jest.fn() })),
      NoSubscriberBehavior: { Pause: 'pause' },
      AudioPlayerStatus: { Idle: 'idle' },
    }));

    ({ destroyConnection } = require('../../src/music/player'));

    expect(() => destroyConnection()).not.toThrow();
  });
});
