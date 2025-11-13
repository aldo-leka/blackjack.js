"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
    id: string;
    message: string;
    nickname: string;
    countryCode: string;
    type: "user" | "system";
    timestamp: Date;
}

interface ChatProps {
    disabled?: boolean; // Disable input on set-nickname page
}

export default function Chat({ disabled = false }: ChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Load initial chat history
    useEffect(() => {
        socket.emit("load chat history", { limit: 100, offset: 0 });

        const handleChatHistory = (history: ChatMessage[]) => {
            setMessages(history.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            })));
            if (history.length < 100) {
                setHasMore(false);
            }
        };

        const handleChatMessage = (message: ChatMessage) => {
            setMessages(prev => [{
                ...message,
                timestamp: new Date(message.timestamp)
            }, ...prev]);
        };

        const handleChatError = (errorMsg: string) => {
            setError(errorMsg);
            setTimeout(() => setError(""), 3000);
        };

        socket.on("chat history", handleChatHistory);
        socket.on("chat message", handleChatMessage);
        socket.on("chat error", handleChatError);

        return () => {
            socket.off("chat history", handleChatHistory);
            socket.off("chat message", handleChatMessage);
            socket.off("chat error", handleChatError);
        };
    }, []);

    const loadMoreMessages = () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        const offset = messages.length;

        socket.emit("load chat history", { limit: 100, offset });

        const handleMoreHistory = (history: ChatMessage[]) => {
            if (history.length === 0) {
                setHasMore(false);
            } else {
                setMessages(prev => [
                    ...history.map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    })),
                    ...prev
                ]);
            }
            setIsLoadingMore(false);
            socket.off("chat history", handleMoreHistory);
        };

        socket.on("chat history", handleMoreHistory);
    };

    const sendMessage = () => {
        if (!inputMessage.trim() || disabled) return;

        if (inputMessage.length > 500) {
            setError("Message too long. Max 500 characters.");
            setTimeout(() => setError(""), 3000);
            return;
        }

        socket.emit("send chat message", inputMessage.trim());
        setInputMessage("");
    };

    const formatTimestamp = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Error message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500 text-white px-4 py-2 text-sm text-center mb-2"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input area - on top */}
            <div className="flex mb-2">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    placeholder={disabled ? "Set a nickname to chat" : "Enter your message"}
                    disabled={disabled}
                    maxLength={500}
                    className="flex-1 px-4 py-2 text-white placeholder-white placeholder-opacity-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                />
                <button
                    onClick={sendMessage}
                    disabled={disabled || !inputMessage.trim()}
                    className="px-4 py-2 bg-[#DAA520] text-[#016F32] hover:bg-[#c99b1f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    <Send size={18} />
                </button>
            </div>

            {/* Messages container */}
            <div
                className="h-80 overflow-y-auto space-y-1"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#DAA520 transparent'
                }}
            >
                {/* Messages - newest on top */}
                {messages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                        {msg.type === "system" ? (
                            <div className="text-[#DAA520] italic">
                                {formatTimestamp(msg.timestamp)} {msg.message}
                            </div>
                        ) : (
                            <div className="text-white">
                                {formatTimestamp(msg.timestamp)} {msg.nickname}: {msg.message}
                            </div>
                        )}
                    </div>
                ))}

                {/* Load more button */}
                {hasMore && (
                    <button
                        onClick={loadMoreMessages}
                        disabled={isLoadingMore}
                        className="w-full py-2 text-white text-sm hover:text-[#DAA520] transition-colors disabled:opacity-50"
                    >
                        {isLoadingMore ? "Loading..." : "Load more messages"}
                    </button>
                )}
            </div>
        </div>
    );
}
