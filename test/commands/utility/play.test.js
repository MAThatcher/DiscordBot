const fs = require('node:fs');

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

test('play.execute requires user to be in voice channel', async () => {
  const play = require('../../../src/commands/utility/play');
  const options = { getString: () => 'song.mp3' };
  const interaction = { options, reply: jest.fn().mockResolvedValue(undefined), member: { voice: {} } };

  await play.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith({ content: 'You need to be in a voice channel to use this command.', ephemeral: true });
});

test('play.execute replies when file does not exist', async () => {
  const play = require('../../../src/commands/utility/play');
  const options = { getString: () => 'missing.mp3' };
  const interaction = {
    options,
    reply: jest.fn().mockResolvedValue(undefined),
    member: { voice: { channel: { id: '1', name: 'VC', guild: { id: 'g1', voiceAdapterCreator: {} } } } },
  };

  jest.spyOn(fs, 'existsSync').mockReturnValue(false);

  await play.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith({ content: 'That song could not be found on the bot. Please try another.', ephemeral: true });
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
  const createAudioResource = jest.fn(() => ({ resource: true }));
  const AudioPlayerStatus = { Idle: 'idle' };

  jest.doMock('@discordjs/voice', () => ({ joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus }));

  jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  jest.spyOn(fs, 'createReadStream').mockReturnValue({});

  const play = require('../../../src/commands/utility/play');

  const options = { getString: () => 'song.mp3' };
  const interaction = {
    options,
    reply: jest.fn().mockResolvedValue(undefined),
    member: { voice: { channel: { id: '1', name: 'VC', guild: { id: 'g1', voiceAdapterCreator: {} } } } },
  };

  await play.execute(interaction);

  expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('Joining VC and playing') }));
  // simulate player error
  captured['error'](new Error('boom'));

  expect(mockSubscription.unsubscribe).toHaveBeenCalled();
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
  const createAudioResource = jest.fn(() => ({ resource: true }));
  const AudioPlayerStatus = { Idle: 'idle' };

  jest.doMock('@discordjs/voice', () => ({ joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus }));

  jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  jest.spyOn(fs, 'createReadStream').mockReturnValue({});

  const play = require('../../../src/commands/utility/play');

  const options = { getString: () => 'song.mp3' };
  const interaction = {
    options,
    reply: jest.fn().mockResolvedValue(undefined),
    member: { voice: { channel: { id: '1', name: 'VC', guild: { id: 'g1', voiceAdapterCreator: {} } } } },
  };

  await play.execute(interaction);

  // simulate idle
  captured[AudioPlayerStatus.Idle]();

  expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  expect(mockConnection.destroy).toHaveBeenCalled();
});
