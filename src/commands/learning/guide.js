// This file demonstrates a command with autocomplete options for searching documentation.
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('docs')
        .setDescription('Search SonarQube Documentation!')
        .addStringOption((option) => option.setName('query').setDescription('Phrase to search for').setAutocomplete(true))
        .addStringOption((option) =>
            option.setName('version').setDescription('Version to search in').setAutocomplete(true),
        ),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        let choices;
        if (focusedOption.name === 'query') {
            choices = [
                'Web API',
                'DevOps Integration',
                'Azure AD',
                'Post Upgrade Steps',
                'Release Notes',
            ];
        }
        if (focusedOption.name === 'version') {
            choices = ['9.9', '2025.1', '2025.2', '2025.3', '2025.4', '2025.5'];
        }
        const filtered = choices.filter((choice) => choice.startsWith(focusedOption.value));
        await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
    },

    async execute(interaction) {
        const query = interaction.options.getString('query');
        const version = interaction.options.getString('version');
        const baseUrl = 'https://docs.sonarsource.com/sonarqube-server/';
        let searchUrl = baseUrl
        if (version && version !== '2025.5') {
            searchUrl += `${encodeURIComponent(version)}/`;
        }
        await interaction.reply({ content: `You can search the guide here: ${searchUrl}?q=${encodeURIComponent(query)}&scope=current`, ephemeral: true });
    },
};