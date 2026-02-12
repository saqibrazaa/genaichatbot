import React, { useState, useEffect, useRef } from 'react';
import { createConversation, getConversations, getConversation, sendMessageToConversation, deleteConversation, updateConversation, uploadFile, sendFeedback } from '../api';


import Sidebar from './Sidebar';
import AnalyticsDashboard from './AnalyticsDashboard';


const ChatInterface = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('');

    const [temperature, setTemperature] = useState(0.7);
    const [selectedModel, setSelectedModel] = useState('aura-standard');
    const [attachments, setAttachments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch conversations on mount
    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const convs = await getConversations();
            setConversations(convs);
        } catch (error) {
            console.error("Failed to load conversations", error);
        }
    };

    // Load specific conversation
    const handleSelectConversation = async (id) => {
        setActiveConversationId(id);
        setIsSidebarOpen(false); // Close sidebar on mobile on select
        try {
            const conv = await getConversation(id);
            setMessages(conv.messages || []);
            setSystemPrompt(conv.system_prompt || '');
            setTemperature(conv.temperature !== undefined ? conv.temperature : 0.7);
            setSelectedModel(conv.selected_model || 'aura-standard');
            setAttachments(conv.attachments || []);
        } catch (error) {
            console.error("Failed to load conversation", error);
        }
    };

    const handleDeleteConversation = async (id) => {
        if (!window.confirm("Are you sure you want to delete this conversation?")) return;
        try {
            await deleteConversation(id);
            if (activeConversationId === id) {
                handleNewChat();
            }
            loadConversations();
        } catch (error) {
            console.error("Failed to delete conversation", error);
        }
    };

    const handleNewChat = () => {
        setActiveConversationId(null);
        setMessages([]);
        setSystemPrompt('');
        setTemperature(0.7);
        setSelectedModel('aura-standard');
        setAttachments([]);
        setIsSidebarOpen(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let conversationId = activeConversationId;
        setIsUploading(true);

        try {
            if (!conversationId) {
                const title = "New Chat (File)";
                const newConv = await createConversation(title);
                conversationId = newConv.id;
                setActiveConversationId(conversationId);
                loadConversations();
            }

            const attachment = await uploadFile(conversationId, file);
            setAttachments(prev => [...prev, attachment]);
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const content = input;
        setInput('');

        // Optimistic update
        const userMessage = { role: 'user', content: content };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            let conversationId = activeConversationId;
            let response;

            if (!conversationId) {
                // Create new conversation if none active, use first few words as title
                const title = content.substring(0, 30) + (content.length > 30 ? "..." : "");
                const newConv = await createConversation(title);
                conversationId = newConv.id;
                setActiveConversationId(conversationId);
                // Refresh list to show new chat
                loadConversations();

                // Now send message to this new conversation
                response = await sendMessageToConversation(conversationId, content);
            } else {
                response = await sendMessageToConversation(conversationId, content);
            }

            // The response from backend is the AI message object
            const aiMessage = { role: 'assistant', content: response.content };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Failed to send message", error);
            const errorMsg = error.response?.status === 429
                ? "Rate limit exceeded. Please wait a moment before sending more messages."
                : "Error: Failed to get response.";
            setMessages(prev => [...prev, { role: 'system', content: errorMsg }]);
        } finally {

            setLoading(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    const handleFeedback = async (messageId, isPositive) => {
        if (!messageId || !activeConversationId) return;
        try {
            await sendFeedback(messageId, activeConversationId, isPositive);
            // Update messages to show feedback state if needed
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, feedback: { is_positive: isPositive } } : msg
            ));
        } catch (error) {
            console.error("Failed to send feedback", error);
        }
    };


    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleRegenerate = async () => {
        if (messages.length < 2 || loading) return;

        // Find last user message
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (!lastUserMessage) return;

        // Remove the last assistant message if it exists
        const newMessages = [...messages];
        if (newMessages[newMessages.length - 1].role === 'assistant') {
            newMessages.pop();
        }

        setMessages(newMessages);
        setLoading(true);

        try {
            const response = await sendMessageToConversation(activeConversationId, lastUserMessage.content);
            const aiMessage = { role: 'assistant', content: response.content };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Failed to regenerate response", error);
            setMessages(prev => [...prev, { role: 'system', content: "Error: Failed to regenerate." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!activeConversationId) {
            setIsSettingsOpen(false);
            return;
        }
        try {
            await updateConversation(activeConversationId, {
                system_prompt: systemPrompt,
                temperature: parseFloat(temperature),
                selected_model: selectedModel
            });
            setIsSettingsOpen(false);
        } catch (error) {
            console.error("Failed to save settings", error);
        }
    };

    return (
        <div className="relative flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-[#151118] dark:text-white">

            {/* --- Sidebar (Responsive) --- */}
            <Sidebar
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={handleSelectConversation}
                onNewChat={handleNewChat}
                onDelete={handleDeleteConversation}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />


            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* --- Header --- */}
                <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-[#e1dbe6] dark:border-[#352544] bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-3 lg:px-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-[#151118] dark:text-white leading-tight">Gen AI</h2>
                            <span className="text-[10px] font-medium text-primary uppercase tracking-widest">{selectedModel.replace('aura-', '')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="hidden md:block bg-transparent border-0 text-sm font-bold text-[#79608a] dark:text-[#c6bacf] focus:ring-0 cursor-pointer hover:text-primary transition-colors"
                        >
                            <option value="aura-standard">Gen Standard</option>
                            <option value="aura-creative">Gen Creative</option>
                            <option value="aura-precise">Gen Precise</option>
                        </select>
                        <button onClick={handleNewChat} className="lg:hidden flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                        </button>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f0f5] dark:bg-[#2d1b3a] text-[#151118] dark:text-white transition-colors hover:bg-[#e1dbe6] dark:hover:bg-[#3d274e]">
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                        <button
                            onClick={() => setIsAnalyticsOpen(true)}
                            className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f0f5] dark:bg-[#2d1b3a] text-primary transition-colors hover:bg-primary/10">
                            <span className="material-symbols-outlined">analytics</span>
                        </button>
                    </div>
                </header>


                {/* --- Main Content --- */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden pb-40 lg:pb-48 px-6">
                    <div className="mx-auto flex h-full max-w-[800px] flex-col">
                        {messages.length === 0 ? (
                            /* --- Empty State --- */
                            <div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="mb-6 flex justify-center">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                                        <span className="material-symbols-outlined text-5xl">chat_bubble</span>
                                    </div>
                                </div>
                                <h1 className="mb-4 text-3xl font-bold tracking-tight text-[#151118] dark:text-white lg:text-4xl">
                                    Hi! Ask me anything 👋
                                </h1>
                                <p className="mb-10 text-lg text-[#79608a] dark:text-[#c6bacf]">
                                    I'm your creative partner for drafting, learning, and coding.
                                </p>
                                {/* Chips */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 w-full max-w-2xl">
                                    {["Explain quantum physics", "Write a professional email", "Debug a Python script", "Summarize this article"].map((prompt, idx) => (
                                        <button key={idx} onClick={() => setInput(prompt)} className="flex items-center gap-3 rounded-xl border border-[#e1dbe6] dark:border-[#352544] bg-white dark:bg-[#2d1b3a] p-4 text-left transition-all hover:border-primary hover:bg-primary/5 group">
                                            <span className="material-symbols-outlined text-[#79608a] group-hover:text-primary">lightbulb</span>
                                            <span className="text-sm font-medium text-[#151118] dark:text-[#f3f0f5]">{prompt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* --- Message List --- */
                            <div className="flex flex-col gap-6 py-6">
                                {attachments.length > 0 && (
                                    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-2">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary opacity-70">Knowledge Base</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {attachments.map((att, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#2d1b3a] px-2 py-1 text-[10px] font-medium border border-[#e1dbe6] dark:border-[#352544] shadow-sm">
                                                    <span className="material-symbols-outlined text-[14px] text-primary">description</span>
                                                    <span>{att.filename}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {messages.map((msg, index) => (
                                    <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className="flex flex-col gap-2 max-w-[85%]">
                                            <div className={`rounded-2xl p-4 ${msg.role === 'user'
                                                ? 'bg-primary text-white rounded-br-none'
                                                : 'bg-white dark:bg-[#2d1b3a] border border-[#e1dbe6] dark:border-[#352544] text-[#151118] dark:text-white rounded-bl-none'
                                                }`}>
                                                <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>
                                            </div>
                                            {msg.role === 'assistant' && index === messages.length - 1 && !loading && (
                                                <div className="flex justify-start">
                                                    <button
                                                        onClick={handleRegenerate}
                                                        className="flex items-center gap-1 text-[10px] sm:text-xs text-[#79608a] dark:text-[#c6bacf] hover:text-primary transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">refresh</span>
                                                        Regenerate
                                                    </button>
                                                    <div className="flex items-center gap-2 ml-4">
                                                        <button
                                                            onClick={() => handleCopy(msg.content)}
                                                            className="text-[#79608a] dark:text-[#c6bacf] hover:text-primary transition-colors"
                                                            title="Copy to clipboard"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">content_copy</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleFeedback(msg.id, true)}
                                                            className={`${msg.feedback?.is_positive === true ? 'text-green-500' : 'text-[#79608a] dark:text-[#c6bacf]'} hover:text-green-500 transition-colors`}
                                                            title="Thumbs Up"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">thumb_up</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleFeedback(msg.id, false)}
                                                            className={`${msg.feedback?.is_positive === false ? 'text-red-500' : 'text-[#79608a] dark:text-[#c6bacf]'} hover:text-red-500 transition-colors`}
                                                            title="Thumbs Down"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">thumb_down</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}


                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex w-full justify-start">
                                        <div className="flex items-center gap-2 max-w-[85%] rounded-2xl p-4 bg-white dark:bg-[#2d1b3a] border border-[#e1dbe6] dark:border-[#352544] rounded-bl-none">
                                            <span className="animate-pulse">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </main>

                {/* --- Input Area --- */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark px-4 pb-8 pt-10 pointer-events-none">
                    <div className="mx-auto max-w-[800px] pointer-events-auto">
                        <div className="relative flex w-full flex-col items-stretch overflow-hidden rounded-2xl border border-[#e1dbe6] dark:border-[#352544] bg-white dark:bg-[#2d1b3a] shadow-xl transition-shadow focus-within:ring-2 focus-within:ring-primary/20">
                            <div className="flex items-start px-4 pt-4">
                                <div className="hidden sm:flex mt-1 h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <span className="material-symbols-outlined text-sm">person</span>
                                </div>
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 resize-none border-0 bg-transparent py-2 pl-3 text-base text-[#151118] dark:text-white placeholder:text-[#79608a] dark:placeholder:text-[#c6bacf] focus:ring-0 focus:outline-none"
                                    placeholder="Type a message..."
                                    rows="1"
                                />
                            </div>

                            {/* Attachment Previews */}
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-4 pb-2">
                                    {attachments.map((att, idx) => (
                                        <div key={idx} className="flex items-center gap-2 rounded-lg bg-[#f3f0f5] dark:bg-[#3d274e] px-2 py-1 text-[10px] font-medium border border-[#e1dbe6] dark:border-[#352544]">
                                            <span className="material-symbols-outlined text-sm">description</span>
                                            <span className="truncate max-w-[100px]">{att.filename}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between border-t border-[#f3f0f5] dark:border-[#3d274e] bg-[#f9fafc] dark:bg-[#241530] px-3 py-2">
                                <div className="flex items-center gap-1">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        disabled={isUploading}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#79608a] dark:text-[#c6bacf] hover:bg-[#e1dbe6] dark:hover:bg-[#3d274e] disabled:opacity-50"
                                        title="Attach file"
                                    >
                                        <span className={`material-symbols-outlined ${isUploading ? 'animate-spin' : ''}`}>
                                            {isUploading ? 'sync' : 'attach_file'}
                                        </span>
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="hidden text-xs text-[#79608a] dark:text-[#c6bacf] sm:inline">Press Enter to send</span>
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || loading}
                                        className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-white transition-all hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <span className="hidden text-sm sm:inline">Send</span>
                                        <span className="material-symbols-outlined text-[20px]">send</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-center text-[11px] text-[#79608a] dark:text-[#c6bacf]">
                            Gen AI can make mistakes. Verify important info.
                        </p>
                    </div>
                </div>
            </div >

            {/* --- Settings Modal --- */}
            {
                isSettingsOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1b1022] p-6 shadow-2xl border border-[#e1dbe6] dark:border-[#352544] animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Chat Settings</h3>
                                <button onClick={() => setIsSettingsOpen(false)} className="text-[#79608a] hover:text-[#151118] dark:hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 opacity-70">System Prompt</label>
                                    <textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        className="w-full rounded-xl border border-[#e1dbe6] dark:border-[#352544] bg-[#f9fafc] dark:bg-[#241530] p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none min-h-[100px]"
                                        placeholder="You are a helpful assistant..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5 opacity-70">Model Selection</label>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full rounded-xl border border-[#e1dbe6] dark:border-[#352544] bg-[#f9fafc] dark:bg-[#241530] p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="aura-standard">Gen Standard (Balanced)</option>
                                        <option value="aura-creative">Gen Creative (Exploratory)</option>
                                        <option value="aura-precise">Gen Precise (Technical)</option>
                                    </select>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1.5">
                                        <label className="text-sm font-medium opacity-70">Temperature</label>
                                        <span className="text-xs font-bold text-primary">{temperature}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.1"
                                        value={temperature}
                                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 dark:bg-[#3d274e] rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between mt-1 px-1">
                                        <span className="text-[10px] opacity-50">Precise</span>
                                        <span className="text-[10px] opacity-50">Balanced</span>
                                        <span className="text-[10px] opacity-50">Creative</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold border border-[#e1dbe6] dark:border-[#352544] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSettings}
                                    className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- Analytics Modal --- */}
            <AnalyticsDashboard
                isOpen={isAnalyticsOpen}
                onClose={() => setIsAnalyticsOpen(false)}
            />

            {/* Background Glows */}

            <div className="pointer-events-none fixed -left-20 -top-20 z-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]"></div>
            <div className="pointer-events-none fixed -bottom-20 -right-20 z-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]"></div>
        </div >
    );
};

export default ChatInterface;
