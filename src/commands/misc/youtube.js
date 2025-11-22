const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType, getVoiceConnection } = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
const { spawn } = require('child_process');
const path = require('path');

// Get the yt-dlp binary path
const ytDlpPath = path.join(__dirname, '../../../node_modules/@distube/yt-dlp/bin/yt-dlp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube')
        .setDescription('YouTube audio playback controls')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play audio from a YouTube video')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('The YouTube video URL')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop playback and disconnect the bot')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'stop') {
            return this.handleStop(interaction);
        } else if (subcommand === 'play') {
            return this.handlePlay(interaction);
        }
    },

    async handleStop(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        
        if (!connection) {
            return interaction.reply({ content: 'I\'m not playing anything right now!', ephemeral: true });
        }

        connection.destroy();
        return interaction.reply('⏹️ Stopped playback and disconnected.');
    },

    async handlePlay(interaction) {
        // Check if user is in a voice channel
        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: 'You need to be in a voice channel to use this command!', ephemeral: true });
        }

        const url = interaction.options.getString('url');
        console.log(`YouTube command invoked with URL: ${url}`);

        await interaction.deferReply();

        try {
            // Get video info
            const videoInfo = await youtubedl(url, {
                dumpSingleJson: true,
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
            });
            
            const videoTitle = videoInfo.title;

            // Join the voice channel
            const connection = joinVoiceChannel({
                channelId: interaction.member.voice.channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // Stream audio directly from youtube-dl to Discord
            const stream = spawn(ytDlpPath, [
                '-f', 'bestaudio',
                '-o', '-',
                url
            ]).stdout;
            
            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
            });
            
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            await interaction.editReply(`🎵 Now playing: **${videoTitle}**`);

            // Handle player events
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

            player.on('error', (error) => {
                console.error('Audio player error:', error);
                connection.destroy();
                interaction.followUp({ content: 'An error occurred while playing the audio.', ephemeral: true }).catch(() => {});
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                connection.destroy();
            });

        } catch (error) {
            console.error('YouTube command error:', error);
            await interaction.editReply('Failed to play the video. Please make sure the URL is valid and the video is available.');
        }
    }
};
