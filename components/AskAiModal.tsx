import React, { useState, useEffect, useRef, type FormEvent } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import type { Entrepreneur, Transaction, ChatMessage } from '../types';
import { queryDataWithAi } from '../services/geminiService';

interface AskAiModalProps {
    isOpen: boolean;
    onClose: () => void;
    entrepreneurs: Entrepreneur[];
    transactions: Transaction[];
}

const AskAiModal = ({ isOpen, onClose, entrepreneurs, transactions }: AskAiModalProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setMessages([
                { sender: 'ai', text: "Hello! I'm Aida, your AI data assistant. How can I help you analyze your business data today?" }
            ]);
            setInput('');
            setIsLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        // Auto-scroll to bottom
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { sender: 'user', text: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            if (!process.env.API_KEY) {
                throw new Error("Gemini API key is not configured.");
            }
            const aiResponseText = await queryDataWithAi(userMessage.text, entrepreneurs, transactions, newMessages);
            const aiMessage: ChatMessage = { sender: 'ai', text: aiResponseText };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = { sender: 'ai', text: `Sorry, I encountered an error. ${(error as Error).message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ask AI About Your Data">
            <div className="flex flex-col h-[60vh]">
                <div ref={chatContainerRef} className="flex-grow p-4 bg-gray-100 rounded-md overflow-y-auto chat-container">
                    <div className="flex flex-col space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                                msg.sender === 'user'
                                ? 'bg-primary text-white self-end'
                                : 'bg-gray-200 text-gray-800 self-start'
                            }`}>
                                <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                            </div>
                        ))}
                        {isLoading && (
                            <div className="self-start">
                                <div className="p-3 rounded-lg bg-gray-200 text-gray-800">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="mt-4 flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g., Who was the top earner last month?"
                        className="flex-grow w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900"
                        disabled={isLoading}
                    />
                    <Button type="submit" variant="primary" disabled={isLoading || !input.trim()}>
                        {isLoading ? '...' : 'Send'}
                    </Button>
                </form>
            </div>
        </Modal>
    );
};

export default AskAiModal;