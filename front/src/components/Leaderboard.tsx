"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Currency } from "lucide-react";

interface LeaderboardPlayer {
    rank: number;
    nickname: string;
    cash: number;
    countryCode: string;
    image: string | null;
    isAuthenticated: boolean;
}

export default function Leaderboard() {
    const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/leaderboard?limit=5`
                );
                const data = await response.json();
                setPlayers(data.leaderboard || []);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
        // Refresh every 30 seconds
        const interval = setInterval(fetchLeaderboard, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="relative z-10 w-full max-w-md">
                <div className="rounded-lg p-4">
                    <h3 className="text-[#DAA520] text-xl font-bold italic text-center mb-4 uppercase">
                        Wall of Fame
                    </h3>
                    <div className="text-white text-center">Loading...</div>
                </div>
            </div>
        );
    }

    if (players.length === 0) {
        return null;
    }

    return (
        <motion.div
            className="relative z-10 w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="rounded-lg p-4">
                <h3 className="text-[#DAA520] text-xl font-bold italic text-center mb-4 uppercase">
                    Wall of Fame
                </h3>
                <div className="space-y-2">
                    {players.map((player, index) => (
                        <motion.div
                            key={`${player.nickname}-${index}`}
                            className="flex items-center justify-between px-3 py-2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-[#DAA520] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {player.image ? (
                                        <Image
                                            src={player.image}
                                            alt={player.nickname}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-[#016F32] font-bold text-lg">
                                            {player.nickname.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Player info with dots */}
                                <div className="flex items-end flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1 flex-shrink-0">
                                        <span className="text-white font-semibold">
                                            {player.nickname}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            {player.countryCode}
                                        </span>
                                    </div>
                                    <div className="flex-1 border-b border-dotted border-white mx-2 min-w-[20px] mb-1" />
                                </div>
                            </div>

                            {/* Cash amount */}
                            <div className="text-white font-bold flex-shrink-0 inline-flex items-center">
                                <Currency size={16} className="mr-1" />{player.cash}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
