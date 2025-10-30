"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { socket } from "@/lib/socket";

/**
 * This wrapper component does a handshake with the server to make sure
 * player has a nickname so that the client and server can "talk". 
 */
export default function NicknameEnforcer({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip check if already on set-nickname page
        if (pathname === '/set-nickname') {
            return;
        }

        // do the handshake with the server to confirm that 
        // nickname is set (or not).
        const nickname = localStorage.getItem('nickname');
        if (nickname && nickname.trim() !== "") {
            socket.emit("register nickname", nickname);
        }
        else {
            // Redirect to nickname page with return URL
            router.push(`/set-nickname?returnUrl=${encodeURIComponent(pathname)}`);
        }

        function handleNicknameUnavailable() {
            router.push(`/set-nickname?returnUrl=${encodeURIComponent(pathname)}`);
        }

        socket.on("nickname unavailable", handleNicknameUnavailable);

        return () => {
            socket.off("nickname unavailable", handleNicknameUnavailable);
        }
    }, [pathname, router]);

    return <>{children}</>;
}