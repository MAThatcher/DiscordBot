// This file demonstrates a command that plays audio files from the bot's assets folder in a voice channel.
// Can be used with the LLM once audio files are generated and placed in the assets folder.
const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require('@discordjs/voice');

const musicDir = path.join(__dirname, '..', '..', 'assets', 'audio');

function listMusicFiles() {
  try {
    const files = fs.readdirSync(musicDir).filter((f) => {
      const full = path.join(musicDir, f);
      const stat = fs.statSync(full);
      return stat.isFile();
    });
    return files;
  } catch (err) {
    console.log('Error reading music directory:', err);
    return [];
  }
}

const files = listMusicFiles();

const builder = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Join your voice channel and play a song from the bot assets')
  .addStringOption((option) => {
    option.setName('song').setDescription('Which song to play').setRequired(true);
    for (const f of files.slice(0, 25)) {
      const name = path.parse(f).name;
      option.addChoices({ name, value: f });
    }
    return option;
  });

module.exports = {
  data: builder,
  async execute(interaction) {
    const songFile = interaction.options.getString('song');

    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: 'You need to be in a voice channel to use this command.', ephemeral: true });
    }

    const filePath = path.join(musicDir, songFile);
    if (!fs.existsSync(filePath)) {
      return interaction.reply({ content: 'That song could not be found on the bot. Please try another.', ephemeral: true });
    }

    await interaction.reply({ content: `Joining ${voiceChannel.name} and playing **${path.parse(songFile).name}**` });

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();

    const resource = createAudioResource(fs.createReadStream(filePath));
    player.play(resource);

    const subscription = connection.subscribe(player);

    player.on('error', (err) => {
      console.error('Audio player error:', err);
      try {
        if (subscription) subscription.unsubscribe();
        connection.destroy();
      } catch (e) {
        console.log(e);
      }
    });

    player.on(AudioPlayerStatus.Idle, () => {
      try {
        if (subscription) subscription.unsubscribe();
        connection.destroy();
      } catch (e) {
        console.log(e);
      }
    });
  },
};
