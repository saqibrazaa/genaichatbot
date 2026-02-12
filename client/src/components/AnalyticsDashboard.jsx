import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../api';

const AnalyticsDashboard = ({ isOpen, onClose }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchAnalytics();
        }
    }, [isOpen]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const data = await getAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#1b1022] p-8 shadow-2xl border border-[#e1dbe6] dark:border-[#352544] animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-[#151118] dark:text-white">Platform Analytics</h3>
                        <p className="text-sm text-[#79608a] dark:text-[#c6bacf]">Usage and performance overview</p>
                    </div>
                    <button onClick={onClose} className="text-[#79608a] hover:text-[#151118] dark:hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                ) : analytics ? (
                    <div className="space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-xl bg-[#f9fafc] dark:bg-[#241530] p-5 border border-[#e1dbe6] dark:border-[#352544]">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#79608a] dark:text-[#c6bacf] opacity-70">Total Messages</span>
                                <div className="mt-1 text-3xl font-black text-primary">{analytics.total_messages}</div>
                            </div>
                            <div className="rounded-xl bg-[#f9fafc] dark:bg-[#241530] p-5 border border-[#e1dbe6] dark:border-[#352544]">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#79608a] dark:text-[#c6bacf] opacity-70">Tokens Used</span>
                                <div className="mt-1 text-3xl font-black text-secondary">{analytics.total_tokens}</div>
                            </div>
                            <div className="rounded-xl bg-[#f9fafc] dark:bg-[#241530] p-5 border border-[#e1dbe6] dark:border-[#352544]">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#79608a] dark:text-[#c6bacf] opacity-70">Satisfaction</span>
                                <div className="mt-1 text-3xl font-black text-green-500">
                                    {analytics.positive_feedback_count + analytics.negative_feedback_count > 0
                                        ? Math.round((analytics.positive_feedback_count / (analytics.positive_feedback_count + analytics.negative_feedback_count)) * 100)
                                        : 0}%
                                </div>
                            </div>
                        </div>

                        {/* Model Distribution */}
                        <div>
                            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#79608a] dark:text-[#c6bacf] opacity-70">Model Usage</h4>
                            <div className="space-y-3">
                                {Object.entries(analytics.model_distribution).map(([model, count]) => (
                                    <div key={model} className="relative h-10 w-full overflow-hidden rounded-lg bg-[#f9fafc] dark:bg-[#241530] border border-[#e1dbe6] dark:border-[#352544]">
                                        <div
                                            className="absolute left-0 top-0 h-full bg-primary/20 border-r-2 border-primary transition-all duration-1000"
                                            style={{ width: `${(count / analytics.total_messages) * 100}%` }}
                                        ></div>
                                        <div className="relative flex h-full items-center justify-between px-4 text-sm font-medium">
                                            <span className="capitalize">{model.replace('aura-', '')}</span>
                                            <span className="font-bold">{count} chats</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Feedback Summary */}
                        <div className="flex gap-4">
                            <div className="flex-1 rounded-xl bg-green-500/10 p-4 border border-green-500/20 flex items-center gap-3">
                                <span className="material-symbols-outlined text-green-500 text-3xl">thumb_up</span>
                                <div>
                                    <div className="text-lg font-bold text-green-500">{analytics.positive_feedback_count}</div>
                                    <div className="text-[10px] uppercase font-black opacity-50">Positive</div>
                                </div>
                            </div>
                            <div className="flex-1 rounded-xl bg-red-500/10 p-4 border border-red-500/20 flex items-center gap-3">
                                <span className="material-symbols-outlined text-red-500 text-3xl">thumb_down</span>
                                <div>
                                    <div className="text-lg font-bold text-red-500">{analytics.negative_feedback_count}</div>
                                    <div className="text-[10px] uppercase font-black opacity-50">Negative</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 opacity-50">No data available</div>
                )}

                <div className="mt-10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-xl bg-[#f3f0f5] dark:bg-[#3d274e] px-6 py-2.5 text-sm font-bold text-[#151118] dark:text-white hover:bg-[#e1dbe6] dark:hover:bg-[#4d3366] transition-colors"
                    >
                        Close Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
