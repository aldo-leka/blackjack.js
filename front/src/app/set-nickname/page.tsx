"use client";

import { Suspense, useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { useRouter, useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Chat from "@/components/Chat";

function Form() {
    const [nickname, setNickname] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const lsNickname = localStorage.getItem('nickname');
        if (lsNickname && lsNickname.trim() !== "") {
            setNickname(lsNickname);
        }

        function handleNicknameUnavailable() {
            setError("Nickname is taken");
        }

        function handleNicknameAccepted(data?: { nickname: string; isAuthenticated: boolean }) {
            const finalNickname = data?.nickname || nickname;
            localStorage.setItem("nickname", finalNickname);
            const returnUrl = searchParams.get('returnUrl') || '/';
            router.push(returnUrl);
        }

        socket.on("nickname unavailable", handleNicknameUnavailable);
        socket.on("nickname accepted", handleNicknameAccepted);

        return () => {
            socket.off("nickname unavailable", handleNicknameUnavailable);
            socket.off("nickname accepted", handleNicknameAccepted);
        }
    }, [router, searchParams]);

    return (
        <div className="flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen">
            <div className="relative mt-8">
                <h2 className="text-[#DAA520] text-3xl font-bold">Christmas Blackjack</h2>
                <Image
                    src="/images/santa-hat.svg"
                    alt="Santa Hat"
                    width={40}
                    height={40}
                    className="absolute -top-2 -right-3"
                />
            </div>
            <div className="flex">
                <input
                    className="bg-[#00000044] text-white placeholder-white px-3 py-1"
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                />
                <button
                    onClick={async () => {
                        try {
                            const session = await authClient.getSession();
                            const sessionToken = session?.data?.session?.token;

                            socket.emit("register nickname", {
                                nickname: nickname,
                                sessionToken: sessionToken || null
                            });
                        } catch (error) {
                            socket.emit("register nickname", {
                                nickname: nickname,
                                sessionToken: null
                            });
                        }
                    }}
                    disabled={!nickname.trim()}
                    className="w-8 text-[#016F32] font-semibold bg-[#DAA520] disabled:opacity-50"
                >
                    {'>'}
                </button>
            </div>
            {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
            <div className="w-full px-4 mt-8 mb-8">
                <Chat disabled={true} />
            </div>
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