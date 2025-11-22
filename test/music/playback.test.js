describe('playback', () => {
  let startShuffle, skip, stop, pause, resume, nowPlaying, listSongs, updateVolume;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('startShuffle starts playback with shuffled queue', async () => {
    const mockPlayer = {
      play: jest.fn(),
      state: { status: 'idle' },
    };

    const mockConnection = { subscribe: jest.fn() };

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(() => mockPlayer),
      connectToVoice: jest.fn(() => mockConnection),
      destroyConnection: jest.fn(),
      setCurrentResource: jest.fn(),
      setVolume: jest.fn(),
      getVolume: jest.fn(() => 0.75),
    }));

    jest.doMock('../../src/music/queue', () => ({
      setQueue: jest.fn(),
      getQueue: jest.fn(() => ['song1.mp3', 'song2.mp3']),
      insertNext: jest.fn(),
      rotateToNext: jest.fn(() => 'song1.mp3'),
      getCurrentSong: jest.fn(() => 'song1.mp3'),
      clearQueue: jest.fn(),
    }));

    jest.doMock('../../src/music/util', () => ({
      musicDir: '/music',
      listMusicFiles: jest.fn(() => ['song1.mp3', 'song2.mp3']),
      shuffle: jest.fn(arr => [...arr].reverse()),
    }));

    const fs = require('node:fs');
    jest.spyOn(fs, 'createReadStream').mockReturnValue({});

    jest.doMock('@discordjs/voice', () => ({
      createAudioResource: jest.fn(() => ({ volume: { setVolume: jest.fn() } })),
    }));

    ({ startShuffle } = require('../../src/music/playback'));

    const interaction = {
      reply: jest.fn().mockResolvedValue(undefined),
    };
    const voiceChannel = {
      id: 'channel-123',
      guild: { id: 'guild-456', voiceAdapterCreator: {} }
    };

    await startShuffle(interaction, voiceChannel);

    expect(interaction.reply).toHaveBeenCalledWith('🔀 Starting shuffled playback!');
    expect(mockPlayer.play).toHaveBeenCalled();

    fs.createReadStream.mockRestore();
  });

  test('startShuffle replies when no songs found', async () => {
    jest.doMock('../../src/music/util', () => ({
      musicDir: '/music',
      listMusicFiles: jest.fn(() => []),
      shuffle: jest.fn(arr => arr),
    }));

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(),
      connectToVoice: jest.fn(),
    }));

    ({ startShuffle } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };
    const voiceChannel = { id: '1', guild: { id: '2', voiceAdapterCreator: {} } };

    await startShuffle(interaction, voiceChannel);

    expect(interaction.reply).toHaveBeenCalledWith('No songs found.');
  });

  test('skip stops player when song is playing', () => {
    const mockPlayer = {
      stop: jest.fn(),
    };

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(() => mockPlayer),
    }));

    jest.doMock('../../src/music/queue', () => ({
      getCurrentSong: jest.fn(() => 'song.mp3'),
    }));

    ({ skip } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    skip(interaction);

    expect(interaction.reply).toHaveBeenCalledWith('⏭ Skipping...');
    expect(mockPlayer.stop).toHaveBeenCalled();
  });

  test('skip replies when nothing is playing', () => {
    const mockPlayer = {
      stop: jest.fn(),
    };

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(() => mockPlayer),
    }));

    jest.doMock('../../src/music/queue', () => ({
      getCurrentSong: jest.fn(() => null),
    }));

    ({ skip } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    skip(interaction);

    expect(interaction.reply).toHaveBeenCalledWith('Nothing is playing.');
    expect(mockPlayer.stop).not.toHaveBeenCalled();
  });

  test('stop clears queue and disconnects', () => {
    const mockPlayer = { stop: jest.fn() };
    const destroyConnectionMock = jest.fn();
    const clearQueueMock = jest.fn();

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(() => mockPlayer),
      destroyConnection: destroyConnectionMock,
    }));

    jest.doMock('../../src/music/queue', () => ({
      clearQueue: clearQueueMock,
    }));

    ({ stop } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    stop(interaction);

    expect(interaction.reply).toHaveBeenCalledWith('🛑 Stopping and disconnecting…');
    expect(clearQueueMock).toHaveBeenCalled();
    expect(mockPlayer.stop).toHaveBeenCalled();
    expect(destroyConnectionMock).toHaveBeenCalled();
  });

  test('pause pauses player when playing', () => {
    const mockPlayer = {
      state: { status: 'playing' },
      pause: jest.fn(),
    };

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(() => mockPlayer),
    }));

    ({ pause } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    pause(interaction);

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith('⏸ Paused.');
  });

  test('pause replies when nothing is playing', () => {
    const mockPlayer = {
      state: { status: 'idle' },
      pause: jest.fn(),
    };

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(() => mockPlayer),
    }));

    ({ pause } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    pause(interaction);

    expect(mockPlayer.pause).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith('Nothing is playing.');
  });

  test('resume unpauses player when paused', () => {
    const mockPlayer = {
      state: { status: 'paused' },
      unpause: jest.fn(),
    };

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(() => mockPlayer),
    }));

    ({ resume } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    resume(interaction);

    expect(mockPlayer.unpause).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith('▶ Resumed.');
  });

  test('resume replies when nothing is paused', () => {
    const mockPlayer = {
      state: { status: 'playing' },
      unpause: jest.fn(),
    };

    jest.doMock('../../src/music/player', () => ({
      initPlayer: jest.fn(() => mockPlayer),
    }));

    ({ resume } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    resume(interaction);

    expect(mockPlayer.unpause).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith('Nothing is paused.');
  });

  test('nowPlaying shows current song', () => {
    jest.doMock('../../src/music/queue', () => ({
      getCurrentSong: jest.fn(() => 'my-song.mp3'),
    }));

    ({ nowPlaying } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    nowPlaying(interaction);

    expect(interaction.reply).toHaveBeenCalledWith('🎵 Now playing: **my-song**');
  });

  test('nowPlaying replies when nothing is playing', () => {
    jest.doMock('../../src/music/queue', () => ({
      getCurrentSong: jest.fn(() => null),
    }));

    ({ nowPlaying } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    nowPlaying(interaction);

    expect(interaction.reply).toHaveBeenCalledWith('Nothing is playing.');
  });

  test('listSongs displays all available songs', () => {
    jest.doMock('../../src/music/util', () => ({
      listMusicFiles: jest.fn(() => ['song1.mp3', 'song2.mp3']),
    }));

    ({ listSongs } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    listSongs(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Available songs:\n• song1\n• song2',
      flags: 64
    });
  });

  test('listSongs replies when no songs found', () => {
    jest.doMock('../../src/music/util', () => ({
      listMusicFiles: jest.fn(() => []),
    }));

    ({ listSongs } = require('../../src/music/playback'));

    const interaction = { reply: jest.fn() };

    listSongs(interaction);

    expect(interaction.reply).toHaveBeenCalledWith('No songs found.');
  });

  test('updateVolume sets volume correctly', () => {
    const setVolumeMock = jest.fn();

    jest.doMock('../../src/music/player', () => ({
      setVolume: setVolumeMock,
    }));

    ({ updateVolume } = require('../../src/music/playback'));

    const interaction = {
      reply: jest.fn(),
      options: { getInteger: jest.fn(() => 75) }
    };

    updateVolume(interaction);

    expect(setVolumeMock).toHaveBeenCalledWith(0.75);
    expect(interaction.reply).toHaveBeenCalledWith('🔊 Volume set to **75%**');
  });

  test('updateVolume rejects volume below 0', () => {
    const setVolumeMock = jest.fn();

    jest.doMock('../../src/music/player', () => ({
      setVolume: setVolumeMock,
    }));

    ({ updateVolume } = require('../../src/music/playback'));

    const interaction = {
      reply: jest.fn(),
      options: { getInteger: jest.fn(() => -5) }
    };

    updateVolume(interaction);

    expect(setVolumeMock).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith('Volume must be 0–100.');
  });

  test('updateVolume rejects volume above 100', () => {
    const setVolumeMock = jest.fn();

    jest.doMock('../../src/music/player', () => ({
      setVolume: setVolumeMock,
    }));

    ({ updateVolume } = require('../../src/music/playback'));

    const interaction = {
      reply: jest.fn(),
      options: { getInteger: jest.fn(() => 150) }
    };

    updateVolume(interaction);

    expect(setVolumeMock).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith('Volume must be 0–100.');
  });
});
