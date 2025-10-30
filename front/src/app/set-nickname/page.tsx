"use client";

import { Suspense, useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { useRouter, useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";

function Form() {
    const [nickname, setNickname] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        function handleNicknameUnavailable() {
            setError("Nickname is taken");
        }

        function handleNicknameAccepted() {
            localStorage.setItem("nickname", nickname);
            const returnUrl = searchParams.get('returnUrl') || '/';
            router.push(returnUrl);
        }

        socket.on("nickname unavailable", handleNicknameUnavailable);
        socket.on("nickname accepted", handleNicknameAccepted);

        const lsNickname = localStorage.getItem('nickname');
        if (lsNickname && lsNickname.trim() !== "") {
            setNickname(lsNickname);
            socket.emit("register nickname", lsNickname);
        }

        return () => {
            socket.off("nickname unavailable", handleNicknameUnavailable);
            socket.off("nickname accepted", handleNicknameAccepted);
        }
    }, [router, searchParams, nickname]);

    return (
        <div className="flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen">
            <h2 className="text-[#DAA520] text-3xl font-bold m-4">Blackjack</h2>
            <div className="flex">
                <input
                    className="bg-[#00000044] text-white placeholder-white px-3 py-1"
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                />
                <button
                    onClick={() => socket.emit("register nickname", nickname)}
                    disabled={!nickname.trim()}
                    className="w-8 text-[#016F32] font-semibold bg-[#DAA520] disabled:opacity-50"
                >
                    {'>'}
                </button>
            </div>
            {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
            <div>TEST CI #2</div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<Loading />}>
            <Form />
        </Suspense>
    )
}