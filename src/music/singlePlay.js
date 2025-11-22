const fs = require("node:fs");
const path = require("node:path");
const {
  createAudioResource,
  createAudioPlayer,
  AudioPlayerStatus
} = require("@discordjs/voice");

const {
  musicDir
} = require("./util");

const {
  getCurrentSong,
  insertNext
} = require("./queue");

const {
  setVolume,
  getVolume
} = require("./player");

async function playSingleSong(interaction, voiceChannel) {
  const songFile = interaction.options.getString("name");
  const filePath = path.join(musicDir, songFile);

  if (!fs.existsSync(filePath)) {
    return interaction.reply("❌ That song doesn't exist.");
  }

  if (getCurrentSong()) {
    insertNext(songFile);
    return interaction.reply(`➕ Queued **${path.parse(songFile).name}** to play next.`);
  }

  const connection = require("@discordjs/voice").joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  const tempPlayer = createAudioPlayer();
  connection.subscribe(tempPlayer);

  await interaction.reply(`🎵 Playing **${path.parse(songFile).name}**`);

  const resource = createAudioResource(fs.createReadStream(filePath), {
    inlineVolume: true
  });

  resource.volume.setVolume(getVolume());
  tempPlayer.play(resource);

  tempPlayer.on(AudioPlayerStatus.Idle, () => {
    connection.destroy();
  });

  tempPlayer.on("error", err => {
    console.error("Single play error:", err);
    connection.destroy();
  });
  return;
}

module.exports = {
  playSingleSong
};
