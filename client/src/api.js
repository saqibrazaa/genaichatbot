import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8002',

    headers: {
        'Content-Type': 'application/json',
    },
});

export const createConversation = async (title = "New Chat") => {
    try {
        const response = await api.post('/conversations', { title });
        return response.data;
    } catch (error) {
        console.error("Error creating conversation:", error);
        throw error;
    }
};

export const getConversations = async () => {
    try {
        const response = await api.get('/conversations');
        return response.data;
    } catch (error) {
        console.error("Error fetching conversations:", error);
        throw error;
    }
};

export const getConversation = async (conversationId) => {
    try {
        const response = await api.get(`/conversations/${conversationId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching conversation:", error);
        throw error;
    }
};

export const sendMessageToConversation = async (conversationId, content) => {
    try {
        const response = await api.post(`/conversations/${conversationId}/messages`, {
            role: 'user', // Backend expects role in schema, though logic sets it.
            content: content
        });
        return response.data;
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};

export const updateConversation = async (conversationId, data) => {
    try {
        const response = await api.patch(`/conversations/${conversationId}`, data);
        return response.data;
    } catch (error) {
        console.error("Error updating conversation:", error);
        throw error;
    }
};

export const deleteConversation = async (conversationId) => {
    try {
        const response = await api.delete(`/conversations/${conversationId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting conversation:", error);
        throw error;
    }
};

export const uploadFile = async (conversationId, file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/upload?conversation_id=${conversationId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};

export const sendFeedback = async (messageId, conversationId, isPositive, comment = "") => {
    try {
        const response = await api.post('/feedback', {
            message_id: messageId,
            conversation_id: conversationId,
            is_positive: isPositive,
            comment: comment
        });
        return response.data;
    } catch (error) {
        console.error("Error sending feedback:", error);
        throw error;
    }
};

export const getAnalytics = async () => {
    try {
        const response = await api.get('/analytics');
        return response.data;
    } catch (error) {
        console.error("Error fetching analytics:", error);
        throw error;
    }
};

export default api;

