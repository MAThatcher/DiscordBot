// This file demonstrates the use of command choices
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('gifs')
	.setDescription('Sends a random gif!')
	.addStringOption((option) =>
		option
			.setName('category')
			.setDescription('The gif category')
			.setRequired(true)
			.addChoices(
				{ name: 'Funny', value: 'gif_funny' },
				{ name: 'Meme', value: 'gif_meme' },
				{ name: 'Movie', value: 'gif_movie' },
			),
	);
module.exports = {
	data: data,
	async execute(interaction) {
		//Send pong for testing
		await interaction.reply('Pong!');
		//Could impliment gif API here later
	},
};