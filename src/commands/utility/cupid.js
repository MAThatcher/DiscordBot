const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('wholovesme').setDescription('Who on this server loves you the most?'),
	async execute(interaction) {
        await interaction.reply('Finding out who loves you the most... ❤️');
        setTimeout(() => {
            console.log(interaction)
            const members = interaction.guild.members.cache.filter(member => !member.user.bot && member.id !== interaction.user.id);
            const lover = members.random();
            interaction.editReply(`<@${lover.user.id}> loves you the most! ❤️`);
        }, 5000);
	},
};