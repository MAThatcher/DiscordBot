beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.resetModules();
});

test('play.execute requires user to be in voice channel', async () => {
  const path = require('path');
  const realFs = jest.requireActual('node:fs');

  jest.doMock('node:fs', () => ({
    ...realFs,
    readdirSync: (p, ...rest) => (p.includes(path.join('src', 'assets', 'audio')) ? ['song.mp3'] : realFs.readdirSync(p, ...rest)),
    statSync: (p, ...rest) => (p.endsWith('song.mp3') ? { isFile: () => true } : realFs.statSync(p, ...rest)),
    existsSync: (p) => (p.endsWith('song.mp3') ? true : realFs.existsSync(p)),
    createReadStream: (p) => realFs.createReadStream ? realFs.createReadStream(p) : {},
  }));

  const play = require('../../../src/commands/llm/play');
  const options = { getString: () => 'song.mp3', getSubcommand: () => 'song' };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined), member: { voice: {} } };

  await play.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith({ content: 'Join a voice channel first.', ephemeral: true });
});

test('play.execute replies when file does not exist', async () => {
  const path = require('path');
  const realFs = jest.requireActual('node:fs');
  jest.doMock('node:fs', () => ({
    ...realFs,
    readdirSync: (p, ...rest) => (p.includes(path.join('src', 'assets', 'audio')) ? ['song.mp3'] : realFs.readdirSync(p, ...rest)),
    statSync: (p, ...rest) => (p.endsWith('song.mp3') ? { isFile: () => true } : realFs.statSync(p, ...rest)),
    existsSync: (p) => (p.endsWith('song.mp3') ? true : realFs.existsSync(p)),
    createReadStream: (p) => ({}),
  }));

  const play = require('../../../src/commands/llm/play');
  const options = { getString: () => 'missing.mp3', getSubcommand: () => 'song' };
  const interaction = {
    options,
    reply: jest.fn().mockResolvedValue(undefined),
    member: { voice: { channel: { id: '1', name: 'VC', guild: { id: 'g1', voiceAdapterCreator: {} } } } },
  };

  jest.spyOn(realFs, 'existsSync').mockReturnValue(false);

  await play.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith('❌ That song doesn\'t exist.');
});

test('play.execute plays and cleans up on player error', async () => {
  const captured = {};

  const mockPlayer = {
    play: jest.fn(),
    on: jest.fn((event, cb) => {
      captured[event] = cb;
    }),
  };

  const mockSubscription = { unsubscribe: jest.fn() };

  const mockConnection = {
    subscribe: jest.fn(() => mockSubscription),
    destroy: jest.fn(),
  };

  const joinVoiceChannel = jest.fn(() => mockConnection);
  const createAudioPlayer = jest.fn(() => mockPlayer);
  const createAudioResource = jest.fn(() => ({ resource: true, volume: { setVolume: jest.fn() } }));
  const AudioPlayerStatus = { Idle: 'idle' };

  const path = require('path');
  const realFs = jest.requireActual('node:fs');
  jest.doMock('node:fs', () => ({
    ...realFs,
    readdirSync: (p, ...rest) => (p.includes(path.join('src', 'assets', 'audio')) ? ['song.mp3'] : realFs.readdirSync(p, ...rest)),
    statSync: (p, ...rest) => (p.endsWith('song.mp3') ? { isFile: () => true } : realFs.statSync(p, ...rest)),
    existsSync: (p) => (p.endsWith('song.mp3') ? true : realFs.existsSync(p)),
    createReadStream: (p) => ({}),
  }));

  jest.doMock('@discordjs/voice', () => ({ joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus }));

  jest.doMock('../../../src/music/player', () => ({ getVolume: jest.fn(() => 1.0), setVolume: jest.fn() }));
  jest.doMock('../../../src/music/queue', () => ({ getCurrentSong: jest.fn(() => null), insertNext: jest.fn() }));

  const play = require('../../../src/commands/llm/play');

  const options = { getString: () => 'song.mp3', getSubcommand: () => 'song' };
  const interaction = {
    options,
    reply: jest.fn().mockResolvedValue(undefined),
    member: { voice: { channel: { id: '1', name: 'VC', guild: { id: 'g1', voiceAdapterCreator: {} } } } },
  };

  await play.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith(expect.stringContaining('🎵 Playing'));

  captured['error'](new Error('boom'));

  expect(mockConnection.destroy).toHaveBeenCalled();
});

test('play.execute cleans up on idle', async () => {
  const captured = {};

  const mockPlayer = {
    play: jest.fn(),
    on: jest.fn((event, cb) => {
      captured[event] = cb;
    }),
  };

  const mockSubscription = { unsubscribe: jest.fn() };

  const mockConnection = {
    subscribe: jest.fn(() => mockSubscription),
    destroy: jest.fn(),
  };

  const joinVoiceChannel = jest.fn(() => mockConnection);
  const createAudioPlayer = jest.fn(() => mockPlayer);
  const createAudioResource = jest.fn(() => ({ resource: true, volume: { setVolume: jest.fn() } }));
  const AudioPlayerStatus = { Idle: 'idle' };

  const path = require('path');
  const realFs = jest.requireActual('node:fs');
  jest.doMock('node:fs', () => ({
    ...realFs,
    readdirSync: (p, ...rest) => (p.includes(path.join('src', 'assets', 'audio')) ? ['song.mp3'] : realFs.readdirSync(p, ...rest)),
    statSync: (p, ...rest) => (p.endsWith('song.mp3') ? { isFile: () => true } : realFs.statSync(p, ...rest)),
    existsSync: (p) => (p.endsWith('song.mp3') ? true : realFs.existsSync(p)),
    createReadStream: (p) => ({}),
  }));

  jest.doMock('@discordjs/voice', () => ({ joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus }));

  jest.doMock('../../../src/music/player', () => ({ getVolume: jest.fn(() => 1.0), setVolume: jest.fn() }));
  jest.doMock('../../../src/music/queue', () => ({ getCurrentSong: jest.fn(() => null), insertNext: jest.fn() }));

  const play = require('../../../src/commands/llm/play');

  const options = { getString: () => 'song.mp3', getSubcommand: () => 'song' };
  const interaction = {
    options,
    reply: jest.fn().mockResolvedValue(undefined),
    member: { voice: { channel: { id: '1', name: 'VC', guild: { id: 'g1', voiceAdapterCreator: {} } } } },
  };

  await play.execute(interaction);


  captured[AudioPlayerStatus.Idle]();

  expect(mockConnection.destroy).toHaveBeenCalled();
});
