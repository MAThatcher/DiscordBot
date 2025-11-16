// This file demonstrates a channel-specific command in a Discord bot.

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('test').setDescription('this is a channel specific command'),
    async execute(interaction) {
        if (interaction.channelId === '1439700274762743951') {
            await interaction.reply({ content: 'this is the correct channel!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'This is the wrong channel for this command.', flags: MessageFlags.Ephemeral });
        }
    },
};