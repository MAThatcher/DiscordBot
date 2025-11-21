const fs = require("node:fs");
const path = require("node:path");
const { createAudioResource } = require("@discordjs/voice");

const {
  initPlayer,
  connectToVoice,
  destroyConnection,
  setCurrentResource,
  setVolume,
  getVolume
} = require("./player");

const {
  setQueue,
  getQueue,
  insertNext,
  rotateToNext,
  getCurrentSong,
  clearQueue
} = require("./queue");

const {
  musicDir,
  listMusicFiles,
  shuffle
} = require("./util");
const { MessageFlags } = require("discord.js");
const notPlaying = "Nothing is playing.";

function playNext() {
  const next = rotateToNext();
  if (!next) {
    return;
  }

  const filePath = path.join(musicDir, next);
  const resource = createAudioResource(fs.createReadStream(filePath), {
    inlineVolume: true
  });

  setCurrentResource(resource);

  const player = initPlayer(playNext);
  player.play(resource);
}

async function startShuffle(interaction, voiceChannel) {
  const files = listMusicFiles();
  if (!files.length) {
    return interaction.reply("No songs found.");
  }

  setQueue(shuffle(files));

  await interaction.reply("🔀 Starting shuffled playback!");

  const player = initPlayer(playNext);
  connectToVoice(voiceChannel);

  if (player.state.status !== "playing") {
    playNext();
  }
  return;
}

function skip(interaction) {
  const player = initPlayer(playNext);

  if (!getCurrentSong()) {
    return interaction.reply(notPlaying);
  }

  interaction.reply("⏭ Skipping...");
  player.stop();
  return;
}

function stop(interaction) {
  interaction.reply("🛑 Stopping and disconnecting…");
  clearQueue();

  const player = initPlayer(playNext);
  player.stop();

  destroyConnection();
}

function pause(interaction) {
  const player = initPlayer(playNext);

  if (player.state.status !== "playing") {
    return interaction.reply(notPlaying);
  }

  player.pause();
  interaction.reply("⏸ Paused.");
  return;
}

function resume(interaction) {
  const player = initPlayer(playNext);

  if (player.state.status !== "paused") {
    return interaction.reply("Nothing is paused.");
  }

  player.unpause();
  interaction.reply("▶ Resumed.");
  return;
}

function nowPlaying(interaction) {
  const song = getCurrentSong();
  if (!song) {
    return interaction.reply(notPlaying);
  }
  interaction.reply(`🎵 Now playing: **${path.parse(song).name}**`);
  return;
}

function listSongs(interaction) {
  const files = listMusicFiles();
  if (!files.length) {
    return interaction.reply("No songs found.");
  }
  const message = "Available songs:\n" +
    files.map(f => `• ${path.parse(f).name}`).join("\n");
  interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
}

function addNext(songFile) {
  insertNext(songFile);
}

function updateVolume(interaction) {
  const amount = interaction.options.getInteger("amount");

  if (amount < 0 || amount > 100) {
    return interaction.reply("Volume must be 0–100.");
  }

  setVolume(amount / 100);

  interaction.reply(`🔊 Volume set to **${amount}%**`);
}

module.exports = {
  startShuffle,
  playNext,
  skip,
  stop,
  pause,
  resume,
  nowPlaying,
  listSongs,
  addNext,
  updateVolume,
};
