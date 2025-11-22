const {
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus
} = require('@discordjs/voice');

let player = null;
let connection = null;
let currentResource = null;

let volumeLevel = 0.75;

function initPlayer(onIdle) {
  if (player) {
    return player;
  }

  player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Pause }
  });

  player.on(AudioPlayerStatus.Idle, onIdle);

  player.on('error', (err) => {
    console.error("Audio player error:", err);
    onIdle();
  });

  return player;
}

function connectToVoice(voiceChannel) {
  if (connection) {
    return connection;
  }

  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  connection.subscribe(player);
  return connection;
}

function setCurrentResource(resource) {
  currentResource = resource;
  if (resource?.volume) {
    resource.volume.setVolume(volumeLevel);
  }
}

function setVolume(level) {
  volumeLevel = level;
  if (currentResource?.volume) {
    currentResource.volume.setVolume(level);
  }
}

function getVolume() {
  return volumeLevel;
}

function destroyConnection() {
  if (connection) {
    connection.destroy();
    connection = null;
  }
}

module.exports = {
  player,
  initPlayer,
  connectToVoice,
  destroyConnection,
  setCurrentResource,
  setVolume,
  getVolume,
};
