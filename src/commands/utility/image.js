const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

const imagesDir = path.join(__dirname, '..', '..', 'assets', 'images');

function listImages() {
    try {
        const files = fs.readdirSync(imagesDir).filter((f) => {
            const full = path.join(imagesDir, f);
            return fs.statSync(full).isFile();
        });
        return files;
    } catch (err) {
        console.error('Failed to read images directory:', err);
        return [];
    }
}

const files = listImages();

const builder = new SlashCommandBuilder()
    .setName('image')
    .setDescription('Display an image from the bot assets (or random)')
    .addStringOption((option) => {
        option.setName('file').setDescription('Which image to display (optional)').setRequired(false);
        for (const f of files.slice(0, 25)) {
            const name = path.parse(f).name;
            option.addChoices({ name, value: f });
        }
        return option;
    });

module.exports = {
    data: builder,
    async execute(interaction) {
        if (files.length === 0) {
            return interaction.reply({ content: 'No images found on the bot. Place files in `src/assets/images`.', ephemeral: true });
        }

        let fileName = interaction.options.getString('file');
        if (!fileName) {

            fileName = files[Math.floor(Math.random() * files.length)];
        }

        const filePath = path.join(imagesDir, fileName);
        if (!fs.existsSync(filePath)) {
            return interaction.reply({ content: 'That image could not be found. Try a different one.', ephemeral: true });
        }

        const attachment = new AttachmentBuilder(filePath);

        await interaction.reply({ content: `Here you go: **${path.parse(fileName).name}**`, files: [attachment] });
    },
};
