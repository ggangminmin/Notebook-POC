import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Send,
    PanelLeft,
    MessageSquare,
    Trash2,
    ChevronDown,
    Settings,
    Paperclip,
    ArrowUp,
    Sparkles,
    Edit,
    Search,
    X,
    Command,
    Loader2
} from 'lucide-react';
import { callOpenAI } from '../services/aiService';

const ChatAI = ({ onBack, currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [selectedModel, setSelectedModel] = useState('GPT-5 Mini');
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const searchRef = useRef(null);

    // 유저별 로컬 스토리지 키 생성
    const storageKey = `chatai_history_${currentUserId}`;

    // 로컬 스토리지에서 대화 내역 불러오기
    useEffect(() => {
        const savedHistory = localStorage.getItem(storageKey);

        if (savedHistory) {
            const parsed = JSON.parse(savedHistory);
            if (parsed.length > 0) {
                setChatHistory(parsed);
                return;
            }
        }

        // 데이터가 없고 마스터 계정인 경우에만 초기 더미 데이터 표시
        const isMaster = currentUserId === 'demo-admin' || currentUserId === 'admin@test.com' || currentUserId?.includes('admin');
        if (isMaster) {
            const dummy = [
                { id: 1, title: '2024년 4분기 사업실적 보고서 분석', messages: [], date: '방금 전' },
                { id: 2, title: '프로젝트 A 마일스톤 및 리스크 검토', messages: [], date: '1시간 전' },
                { id: 3, title: '신규 서비스 아키텍처 설계안 피드백', messages: [], date: '오늘 오전' }
            ];
            setChatHistory(dummy);
        } else {
            setChatHistory([]);
        }
    }, [currentUserId, storageKey]);

    // 대화 내역 저장
    const saveHistory = (newHistory) => {
        setChatHistory(newHistory);
        localStorage.setItem(storageKey, JSON.stringify(newHistory));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isSearchOpen) {
            searchRef.current?.focus();
        }
    }, [isSearchOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const systemMessage = {
            role: 'system',
            content: '당신은 실시간 지능형 비즈니스 어시스턴트 \'Chat AI\'입니다. 사용자의 질문에 대해 GPT-5 Mini 모델의 빠른 속도와 효율성을 바탕으로 즉각적이고 정확한 비즈니스 인사이트를 제공합니다. 항상 한국어로 답변하며, 간결하면서도 핵심을 찌르는 답변을 유지하세요.'
        };
        const userMessage = { role: 'user', content: input };
        // API 호출용: 시스템 메시지 + 기존 대화 + 현재 메시지
        const apiMessages = [systemMessage, ...messages, userMessage];

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const useMini = selectedModel.includes('Mini');
            const useThinking = selectedModel.includes('Pro') || selectedModel.includes('5.2');

            const aiResponse = await callOpenAI(apiMessages, useThinking, useMini);
            const assistantMessage = { role: 'assistant', content: aiResponse };

            setMessages(prev => [...prev, assistantMessage]);

            if (messages.length === 0) {
                const updatedHistoryMessages = [userMessage, assistantMessage];
                const newHistoryItem = {
                    id: Date.now(),
                    title: input.length > 20 ? input.substring(0, 20) + '...' : input,
                    messages: updatedHistoryMessages,
                    date: '방금 전'
                };
                saveHistory([newHistoryItem, ...chatHistory]);
            }
        } catch (error) {
            console.error('AI Chatbot Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        setMessages([]);
        setInput('');
        inputRef.current?.focus();
    };

    const loadChat = (historyItem) => {
        if (historyItem.messages && historyItem.messages.length > 0) {
            setMessages(historyItem.messages);
        } else {
            setMessages([]);
        }
        setIsSearchOpen(false);
        if (!isSidebarOpen && window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    const filteredHistory = chatHistory.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const inputJSX = (
        <div className="bg-white rounded-[28px] shadow-xl border border-slate-100 focus-within:border-blue-200 focus-within:ring-8 focus-within:ring-blue-50/50 transition-all flex flex-col p-4 w-full max-w-4xl mx-auto relative group">
            <textarea
                ref={inputRef}
                rows="1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Chat AI에게 물어보기"
                className="w-full text-[16px] bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-1.5 leading-relaxed text-slate-700 custom-scrollbar placeholder:text-slate-400"
                style={{ minHeight: '36px', maxHeight: '200px' }}
            />

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center space-x-6">
                    <button
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-all text-gray-400"
                    >
                        <Plus className="w-5 h-5 pointer-events-none" />
                    </button>

                    <div className="flex items-center space-x-1.5 px-1 py-1 rounded-lg text-[14px] font-bold text-blue-600 bg-blue-50/50">
                        <span>GPT-5 Mini</span>
                    </div>
                </div>

                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-20 active:scale-95 shadow-md"
                >
                    <ArrowUp className="w-5 h-5" strokeWidth={3} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-full bg-white overflow-hidden font-sans relative">
            {/* Search Overlay (사진 매칭) */}
            {isSearchOpen && (
                <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-6 overflow-hidden animate-fade-in">
                    <div
                        className="w-full max-w-2xl bg-[#1e1e1e] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[70vh] animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input Header */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-3">
                            <div className="bg-white/5 p-1.5 rounded-md">
                                <Search className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                ref={searchRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="채팅 및 프로젝트 검색"
                                className="flex-1 bg-transparent border-none focus:outline-none text-white text-[15px] placeholder:text-gray-500"
                            />
                            <div className="flex items-center gap-1.5">
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="p-1 hover:bg-white/5 rounded text-gray-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className="p-1 hover:bg-white/5 rounded text-gray-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Search Results List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {filteredHistory.length > 0 ? (
                                <div className="space-y-0.5">
                                    {filteredHistory.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            onClick={() => loadChat(item)}
                                            className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/5"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 transition-colors group-hover:bg-white/10 group-hover:text-white">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[14px] text-gray-300 group-hover:text-white truncate font-medium">
                                                        {item.title}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-[12px] text-gray-500">{item.date}</span>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-bold border border-white/5">
                                                    Enter
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-gray-500 space-y-3">
                                    <Search className="w-10 h-10 opacity-20" />
                                    <p className="text-sm font-medium">검색 결과가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Background click to close */}
                    <div className="absolute inset-0 -z-10" onClick={() => setIsSearchOpen(false)} />
                </div>
            )}

            {/* Sidebar (사진 2 매칭) */}
            <div
                className={`${isSidebarOpen ? 'w-[280px]' : 'w-0'} bg-white transition-all duration-300 flex flex-col overflow-hidden relative border-r border-gray-50`}
            >
                <div className="p-5 flex items-center gap-2">
                    <button
                        onClick={startNewChat}
                        className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-[#6b3a72] via-[#2d4d62] to-[#125c6d] text-white px-4 py-3 rounded-xl transition-all shadow-sm font-bold text-[14px]"
                    >
                        <Edit className="w-5 h-5" />
                        <span>새 대화 시작</span>
                    </button>

                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-all"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-all"
                    >
                        <PanelLeft className="w-6 h-6 rotate-180" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 mt-2">
                    <div className="text-[14px] font-bold text-gray-400 px-3 py-3">내 채팅</div>
                    <div className="space-y-0.5">
                        {chatHistory.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => loadChat(item)}
                                className="group flex items-center px-3 py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                            >
                                <span className="text-[14px] text-gray-600 truncate font-medium">{item.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-[#F3F6FA] relative overflow-hidden">
                {/* Toggle Sidebar Icon - Closed State */}
                {!isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute left-6 top-6 z-10 w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 shadow-sm hover:bg-gray-50 transition-all"
                    >
                        <PanelLeft className="w-6 h-6" />
                    </button>
                )}

                {/* Chat Area */}
                <div className={`flex-1 overflow-y-auto ${messages.length === 0 ? 'flex items-center justify-center pb-20' : 'pt-24 pb-48'}`}>
                    {messages.length === 0 ? (
                        <div className="w-full flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
                            <h1 className="text-4xl md:text-[44px] font-black text-slate-800 tracking-tighter text-center mb-10">
                                무엇이든 요청해보세요
                            </h1>
                            <div className="w-full max-w-4xl px-4">
                                {inputJSX}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-10 px-6">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                                >
                                    <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
                                        <div className={`p-4 rounded-2xl ${msg.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white text-gray-800 border border-gray-100'
                                            } text-[15px] leading-relaxed font-medium shadow-sm`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center shadow-sm">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Bottom Input Container */}
                {messages.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 px-6 py-8 bg-gradient-to-t from-[#F3F6FA] via-[#F3F6FA] to-transparent">
                        {inputJSX}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatAI;
