// Shared conversation history manager
// This allows both the /ask command and messageCreate event to access the same history

const conversationHistory = new Map();
const conversationTimestamps = new Map();

// Maximum number of messages to keep in history (to avoid token limits)
const MAX_HISTORY_MESSAGES = 20;

// Auto-expire conversations after 2 hours of inactivity
const EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

module.exports = {
    hasHistory(threadId) {
        return conversationHistory.has(threadId);
    },

    getHistory(threadId) {
        if (!conversationHistory.has(threadId)) {
            conversationHistory.set(threadId, []);
        }
        
        let history = conversationHistory.get(threadId);
        
        // Limit history size
        if (history.length > MAX_HISTORY_MESSAGES) {
            history = history.slice(-MAX_HISTORY_MESSAGES);
            conversationHistory.set(threadId, history);
        }
        
        return history;
    },

    addMessages(threadId, messages) {
        if (!conversationHistory.has(threadId)) {
            conversationHistory.set(threadId, []);
        }
        
        const history = conversationHistory.get(threadId);
        history.push(...messages);
        
        // Update timestamp
        conversationTimestamps.set(threadId, Date.now());
    },

    clearHistory(threadId) {
        conversationHistory.delete(threadId);
        conversationTimestamps.delete(threadId);
    },

    getMaxHistoryMessages() {
        return MAX_HISTORY_MESSAGES;
    },

};
