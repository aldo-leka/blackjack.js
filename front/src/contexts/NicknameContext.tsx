"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { authClient } from "@/lib/auth-client";

interface NicknameContextType {
    isHandshakeComplete: boolean;
    nickname: string | null;
}

const NicknameContext = createContext<NicknameContextType | undefined>(undefined);

export function NicknameProvider({ children }: { children: React.ReactNode }) {
    const [isHandshakeComplete, setIsHandshakeComplete] = useState(false);
    const [nickname, setNickname] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip check if already on set-nickname page
        if (pathname === '/set-nickname') {
            return;
        }

        // Do the handshake with the server to confirm that
        // nickname is set (or not).
        const registerNickname = async () => {
            const storedNickname = localStorage.getItem('nickname');
            if (storedNickname && storedNickname.trim() !== "") {
                setNickname(storedNickname);
                try {
                    const session = await authClient.getSession();
                    const sessionToken = session?.data?.session?.token;
                    socket.emit("register nickname", {
                        nickname: storedNickname,
                        sessionToken: sessionToken || null
                    });
                } catch (error) {
                    socket.emit("register nickname", {
                        nickname: storedNickname,
                        sessionToken: null
                    });
                }
            } 
            else {
                // Redirect to nickname page with return URL
                router.push(`/set-nickname?returnUrl=${encodeURIComponent(pathname)}`);
            }
        };

        registerNickname();

        function handleNicknameAccepted(data?: { nickname: string; isAuthenticated: boolean }) {
            // If server sent back a different nickname (for authenticated users), update it
            if (data && data.nickname && data.nickname !== nickname) {
                console.log(`Server corrected nickname from '${nickname}' to '${data.nickname}'`);
                setNickname(data.nickname);
                localStorage.setItem('nickname', data.nickname);
            }
            setIsHandshakeComplete(true);
        }

        function handleNicknameUnavailable() {
            setIsHandshakeComplete(false);
            router.push(`/set-nickname?returnUrl=${encodeURIComponent(pathname)}`);
        }

        socket.on("nickname accepted", handleNicknameAccepted);
        socket.on("nickname unavailable", handleNicknameUnavailable);

        return () => {
            socket.off("nickname accepted", handleNicknameAccepted);
            socket.off("nickname unavailable", handleNicknameUnavailable);
        };
    }, [pathname, router]);

    return (
        <NicknameContext.Provider value={{ isHandshakeComplete, nickname }}>
            {children}
        </NicknameContext.Provider>
    );
}

export function useNickname() {
    const context = useContext(NicknameContext);
    if (context === undefined) {
        throw new Error("useNickname must be used within a NicknameProvider");
    }
    return context;
}
