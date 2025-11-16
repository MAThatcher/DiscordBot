// This file demonstrates a command with subcommands
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get info about a user or a server!')
    .addSubcommand((subcommand) =>
        subcommand
            .setName('user')
            .setDescription('Info about a user')
            .addUserOption((option) => option.setName('target').setDescription('The user')),
    )
    .addSubcommand((subcommand) => subcommand.setName('server').setDescription('Info about the server'));

module.exports = {
    data: data,
    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'user') {
            const user = interaction.options.getUser('target') || interaction.user;
            await interaction.reply(`User info for ${user.globalName} (ID: ${user.id})`);
        } else if (interaction.options.getSubcommand() === 'server') {
            const guild = interaction.guild;
            await interaction.reply(`Server info for ${guild.name} (ID: ${guild.id})`);
        }
    },
};