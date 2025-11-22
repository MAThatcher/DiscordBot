const { Events } = require('discord.js');
const { spawn } = require('child_process');
const path = require('path');

// Import the shared conversation history from ask.js
// Since we can't directly import from ask.js, we'll use a shared module
const conversationManager = require('../utils/conversationManager');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if this message is in a thread created by the bot
        if (!message.channel.isThread()) return;

        // Check if the thread has conversation history (meaning it was created by /ask command)
        const threadId = message.channelId;
        if (!conversationManager.hasHistory(threadId)) return;

        // Check if user has the required role
        if (!message.member.roles.cache.some(role => role.name === 'Vibe Prompter')) {
            return;
        }

        // Show typing indicator
        await message.channel.sendTyping();

        const prompt = message.content;
        const scriptPath = path.join(__dirname, '../../../demo/ollama_cli_copy.py');

        // Get conversation history
        let history = conversationManager.getHistory(threadId);

        // Spawn the Python process with history
        const pythonProcess = spawn('python3', [
            scriptPath,
            prompt,
            JSON.stringify(history)
        ]);
        
        let outputData = '';
        let errorData = '';

        // Collect data from stdout
        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        // Collect errors from stderr
        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            console.error(`Received error chunk: ${data.toString()}`);
        });

        // Handle process close
        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                console.error(`Stderr: ${errorData}`);
                return await message.reply('Sorry, something went wrong with the AI script.');
            }

            // Update conversation history
            conversationManager.addMessages(threadId, [
                { role: 'user', content: prompt },
                { role: 'assistant', content: outputData }
            ]);

            // Send the AI output
            const maxLength = 2000;

            if (outputData.length <= maxLength) {
                // If it fits, send as one message
                await message.reply(outputData || 'No response received.');
            } else {
                // Split into multiple messages
                let remainingContent = outputData;
                let isFirst = true;

                while (remainingContent.length > 0) {
                    const chunk = remainingContent.substring(0, maxLength);
                    if (isFirst) {
                        await message.reply(chunk);
                        isFirst = false;
                    } else {
                        await message.channel.send(chunk);
                    }
                    remainingContent = remainingContent.substring(maxLength);
                }
            }
        });
    },
};
