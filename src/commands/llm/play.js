const { SlashCommandBuilder } = require("discord.js");
const { listMusicFiles } = require("../../music/util");

const {
  startShuffle,
  skip,
  stop,
  pause,
  resume,
  nowPlaying,
  listSongs,
  updateVolume
} = require("../../music/playback");

const {
  playSingleSong
} = require("../../music/singlePlay");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Music playback controls")

    .addSubcommand(c => c.setName("start").setDescription("Start shuffle playback"))
    .addSubcommand(c => c.setName("skip").setDescription("Skip current song"))
    .addSubcommand(c => c.setName("stop").setDescription("Stop and disconnect"))
    .addSubcommand(c => c.setName("pause").setDescription("Pause playback"))
    .addSubcommand(c => c.setName("resume").setDescription("Resume playback"))
    .addSubcommand(c => c.setName("now").setDescription("Show currently playing"))
    .addSubcommand(c => c.setName("list").setDescription("List all available songs"))
    .addSubcommand(c =>
      c
        .setName("volume")
        .setDescription("Set volume 0–100")
        .addIntegerOption(o =>
          o.setName("amount").setDescription("Volume %").setRequired(true)
        )
    )
    .addSubcommand(c =>
      c
        .setName("song")
        .setDescription("Play a specific song")
        .addStringOption(option => {
          const files = listMusicFiles();
          option
            .setName("name")
            .setDescription("Pick a song")
            .setRequired(true);

          for (const file of files) {
            const name = require("path").parse(file).name;
            option.addChoices({ name, value: file });
          }

          return option;
        })
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply({ content: "Join a voice channel first.", ephemeral: true });
    }

    switch (sub) {
      case "start": return startShuffle(interaction, channel);
      case "skip": return skip(interaction);
      case "stop": return stop(interaction);
      case "pause": return pause(interaction);
      case "resume": return resume(interaction);
      case "now": return nowPlaying(interaction);
      case "list": return listSongs(interaction);
      case "volume": return updateVolume(interaction);
      case "song": return playSingleSong(interaction, channel);
      default: return interaction.reply("Unknown command.");
    }
  }
};
