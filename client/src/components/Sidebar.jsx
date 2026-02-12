import React from 'react';

const Sidebar = ({ conversations, activeId, onSelect, onNewChat, onDelete, isOpen, onClose }) => {
    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#e1dbe6] dark:border-[#352544] bg-[#f9fafc] dark:bg-[#1b1022] transition-transform duration-300 transform lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4">
                    <button
                        onClick={onNewChat}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 shadow-md hover:shadow-lg">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span>New Chat</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2">
                    <div className="space-y-1">
                        {conversations.length === 0 ? (
                            <div className="p-4 text-center text-sm text-[#79608a] dark:text-[#c6bacf]">
                                No history yet.
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <div key={conv.id} className="group relative">
                                    <button
                                        onClick={() => onSelect(conv.id)}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${activeId === conv.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-[#151118] dark:text-[#f3f0f5] hover:bg-[#e1dbe6] dark:hover:bg-[#2d1b3a]'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                                        <span className="truncate text-left pr-6">{conv.title || "New Chat"}</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(conv.id);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#79608a] dark:text-[#c6bacf] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete chat"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="border-t border-[#e1dbe6] dark:border-[#352544] p-4">
                    <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-[#2d1b3a] p-3 shadow-sm border border-[#e1dbe6] dark:border-[#352544]">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-purple-400 text-white font-bold text-xs">
                            U
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#151118] dark:text-white">User</span>
                            <span className="text-[10px] text-[#79608a] dark:text-[#c6bacf]">Free Plan</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};


export default Sidebar;
