"use client";

import Chip from "@/components/Chip";
import { socket } from "@/lib/socket";
import { Repeat } from "lucide-react";
import { useEffect } from "react";
import { useNickname } from "@/contexts/NicknameContext";

export default function Page() {
    const { isHandshakeComplete } = useNickname();

    useEffect(() => {
        // Only emit join room after handshake is complete
        if (!isHandshakeComplete) {
            return;
        }
        
        socket.emit("join room");

        function joinedRoom() {
            console.log("joined room");
        }

        function userJoined(nickname: string) {
            console.log(`${nickname} joined.`);
        }

        function userReconnected(nickname: string) {
            console.log(`${nickname} reconnected.`);
        }

        function userDisconnected(nickname: string) {
            console.log(`${nickname} disconnected.`);
        }

        function userRemoved(nickname: string) {
            console.log(`${nickname} removed.`);
        }

        socket.on("joined room", joinedRoom);
        socket.on("user joined", userJoined);
        socket.on("user reconnected", userReconnected);
        socket.on("user disconnected", userDisconnected);
        socket.on("user removed", userRemoved);

        return () => {
            console.log("clearing up the socket listeners");
            socket.off("joined room", joinedRoom);
            socket.off("user joined", userJoined);
            socket.off("user reconnected", userReconnected);
            socket.off("user disconnected", userDisconnected);
            socket.off("user removed", userRemoved);
        }
    }, [isHandshakeComplete]);

    return (
        <div className="flex flex-col items-center gap-4 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen select-none">
            <div className="w-full max-w-7xl px-12 flex justify-between items-start">
                <div className="flex-1"></div>
                <div className="bg-[#daa52080] rounded-full size-48 -mt-24 flex items-end justify-center">
                    <div className="text-white font-semibold italic mb-16">
                        Dealer
                    </div>
                </div>
                <div className="flex-1 flex justify-end">
                    <div className="text-[#DAA520] text-center cursor-pointer">
                        <div>
                            X
                        </div>
                        <div>
                            Quit
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-white italic font-semibold">
                Place your bets
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-white italic font-semibold">
                        You (220)
                    </h2>
                    <div className="flex gap-1.5">
                        <div className="flex flex-col gap-2">
                            <Chip color="white" amount={5} />
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">+</button>
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">-</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="red" amount={10} />
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">+</button>
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">-</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="green" amount={0} />
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">+</button>
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">-</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="black" amount={25} />
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">+</button>
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">-</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="blue" amount={50} />
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">+</button>
                            <button className="bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]">-</button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="bg-[#daa52080] rounded-full size-36 border-4 border-[#DAA520]">
                        <div className="flex justify-center items-center h-full">
                            <Chip color="white" amount={0} />
                            <Chip color="red" amount={2} />
                            <Chip color="green" amount={0} />
                            <Chip color="black" amount={0} />
                            <Chip color="blue" amount={0} />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-between">
                        <button className="px-2 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]">
                            <Repeat size={16} />
                        </button>
                        <button className="px-2 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]">
                            2X
                        </button>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-white italic font-semibold">
                        FartyPlayer (120)
                    </h2>
                    <div className="bg-[#daa52039] rounded-full size-36">
                        <div className="flex justify-center items-center h-full">
                            <Chip color="white" amount={0} />
                            <Chip color="red" amount={2} />
                            <Chip color="green" amount={0} />
                            <Chip color="black" amount={0} />
                            <Chip color="blue" amount={0} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-white italic font-semibold">
                        Partypooper (100)
                    </h2>
                    <div className="bg-[#daa52039] rounded-full size-36">
                    </div>
                </div>
            </div>
        </div>
    )
}