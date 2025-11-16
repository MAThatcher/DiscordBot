// This file demonstrates the use of channel options and boolean ephemeral responses.
const { SlashCommandBuilder, MessageFlags, ChannelType } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Replies with your input!')
	.addStringOption((option) =>
		option
			.setName('input')
			.setDescription('The input to echo back')
			.setMaxLength(2000),
	)
	.addChannelOption((option) =>
		option
			.setName('channel')
			.setDescription('The channel to echo into')
			.addChannelTypes(ChannelType.GuildText),
	)
	.addBooleanOption((option) => option.setName('embed').setDescription('Whether or not the echo should be embedded'));

module.exports = {
    data: data,
    async execute(interaction) {
        const input = interaction.options.getString('input');
        const ephemeral = interaction.options.getBoolean('ephemeral');

        await interaction.reply({
            content: input,
            flags: ephemeral ? MessageFlags.Ephemeral : undefined,
        });
    }
}