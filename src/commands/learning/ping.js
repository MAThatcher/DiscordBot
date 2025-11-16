// This file demonstrates a command which uses delayed responses.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		setTimeout(() => {
			interaction.editReply('Pong!');
		}, 15000);
	},
	
};