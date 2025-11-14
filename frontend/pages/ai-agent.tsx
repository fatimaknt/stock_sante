import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

type Message = {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
};

export default function AIAgentPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simuler une réponse de l'IA (à remplacer par un appel API réel)
        setTimeout(() => {
            const assistantMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Je suis votre assistant IA pour la gestion de stock et de flotte. Comment puis-je vous aider aujourd\'hui ?',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <Layout>
            <div className="pt-24 px-4 sm:px-6 pb-7 min-h-screen bg-gray-50">
                <TopBar />

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-emerald-600 mb-2">Agent IA - Conseiller Gestion</h1>
                    <p className="text-gray-600">Obtenez des conseils intelligents sur la gestion de votre inventaire et flotte</p>
                </div>

                {/* Conversation Area */}
                <div className="bg-white rounded-xl shadow-lg p-6 h-[calc(100vh-280px)] flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                        <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="8" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
                            <circle cx="10.5" cy="7" r="1" fill="currentColor"/>
                            <circle cx="13.5" cy="7" r="1" fill="currentColor"/>
                            <rect x="10" y="9" width="4" height="1" rx="0.5" fill="currentColor"/>
                            <rect x="6" y="12" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
                            <circle cx="9" cy="15" r="0.8" fill="currentColor"/>
                            <circle cx="12" cy="15" r="0.8" fill="currentColor"/>
                            <circle cx="15" cy="15" r="0.8" fill="currentColor"/>
                            <rect x="3" y="13" width="3" height="2" rx="0.5" fill="currentColor"/>
                            <rect x="18" y="13" width="3" height="2" rx="0.5" fill="currentColor"/>
                        </svg>
                        <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-20 h-20 rounded-full border-4 border-emerald-600 flex items-center justify-center mb-4 bg-emerald-50">
                                    <svg className="w-12 h-12 text-emerald-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="8" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
                                        <circle cx="10.5" cy="7" r="1" fill="currentColor"/>
                                        <circle cx="13.5" cy="7" r="1" fill="currentColor"/>
                                        <rect x="10" y="9" width="4" height="1" rx="0.5" fill="currentColor"/>
                                        <rect x="6" y="12" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
                                        <circle cx="9" cy="15" r="0.8" fill="currentColor"/>
                                        <circle cx="12" cy="15" r="0.8" fill="currentColor"/>
                                        <circle cx="15" cy="15" r="0.8" fill="currentColor"/>
                                        <rect x="3" y="13" width="3" height="2" rx="0.5" fill="currentColor"/>
                                        <rect x="18" y="13" width="3" height="2" rx="0.5" fill="currentColor"/>
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Bonjour ! Je suis votre conseiller IA</h3>
                                <p className="text-gray-600 mb-6">Posez-moi des questions sur votre gestion d'inventaire et flotte</p>
                                <div className="text-left space-y-2 text-gray-700">
                                    <p className="font-medium">Je peux vous aider avec :</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Analyse de stock et recommandations</li>
                                        <li>Gestion de la flotte automobile</li>
                                        <li>Optimisation des coûts</li>
                                        <li>Alertes et prévisions</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                                            message.role === 'user'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                        }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-emerald-100' : 'text-gray-500'}`}>
                                            {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-lg px-4 py-3">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-gray-200 pt-4">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Posez votre question..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                        >
                            <span>Envoyer</span>
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </Layout>
    );
}

