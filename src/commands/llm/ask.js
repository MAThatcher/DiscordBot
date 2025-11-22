const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { spawn } = require('child_process');
const path = require('path');
const conversationManager = require('../../utils/conversationManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the AI a question (via Python script)')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('The question you want to ask')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('clear')
                .setDescription('Clear conversation history for this thread')
                .setRequired(false)),
    //.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (interaction.member.roles.cache.some(role => role.name === 'Vibe Prompter')) {
            // 1. Defer the reply because AI takes time (>3 seconds)
            await interaction.deferReply();

            const prompt = interaction.options.getString('prompt');
            const clearHistory = interaction.options.getBoolean('clear') || false;

            // Determine thread ID (use channel ID if already in thread, otherwise will be set after thread creation)
            let threadId = interaction.channel.isThread() ? interaction.channelId : null;

            // Handle clear history option
            if (clearHistory && threadId) {
                conversationManager.clearHistory(threadId);
                await interaction.editReply('✅ Conversation history cleared. Now processing your question...');
            }

            // Path to your python script
            const scriptPath = path.join(__dirname, '../../../../demo/ollama_cli_copy.py');

            // Get conversation history for this thread
            let history = threadId ? conversationManager.getHistory(threadId) : [];

            // 2. Spawn the Python process with history
            const pythonProcess = spawn('python3', [
                scriptPath,
                prompt,
                JSON.stringify(history)
            ]);
            let outputData = '';
            let errorData = '';

            // 3. Collect data from stdout
            pythonProcess.stdout.on('data', (data) => {
                outputData += data.toString();
            });

            // 4. Collect errors from stderr
            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
                console.error(`Received error chunk: ${data.toString()}`);
            });

            // 5. Handle process close
            pythonProcess.on('close', async (code) => {
                if (code !== 0) {
                    console.error(`Python script exited with code ${code}`);
                    console.error(`Stderr: ${errorData}`);
                    return await interaction.editReply('Sorry, something went wrong with the AI script.');
                }

                // Reply with the prompt
                const reply = await interaction.editReply(`**Question:** ${prompt}`);

                // Determine where to send the AI response
                let targetChannel;

                if (interaction.channel.isThread()) {
                    // If already in a thread, use the same thread
                    targetChannel = interaction.channel;
                    threadId = interaction.channelId;
                } else {
                    // Create a thread for the AI response
                    targetChannel = await reply.startThread({
                        name: `AI Response: ${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}`,
                        autoArchiveDuration: 60, // Archive after 1 hour of inactivity
                    });
                    threadId = targetChannel.id;
                }

                // Update conversation history
                conversationManager.addMessages(threadId, [
                    { role: 'user', content: prompt },
                    { role: 'assistant', content: outputData }
                ]);

                // Send the AI output in the thread
                const maxLength = 2000;

                if (outputData.length <= maxLength) {
                    // If it fits, send as one message
                    await targetChannel.send(outputData || 'No response received.');
                } else {
                    // Split into multiple messages
                    let remainingContent = outputData;

                    while (remainingContent.length > 0) {
                        const chunk = remainingContent.substring(0, maxLength);
                        await targetChannel.send(chunk);
                        remainingContent = remainingContent.substring(maxLength);
                    }
                }
            });
        } else {
            return interaction.reply({ content: 'You do not have permission to use this command. You need the Vibe Prompter Role', flags: MessageFlags.Ephemeral });
        }
    },
};