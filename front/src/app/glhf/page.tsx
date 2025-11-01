"use client";

import Chip from "@/components/Chip";
import { socket } from "@/lib/socket";
import { Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import { useNickname } from "@/contexts/NicknameContext";
import { CHIPS } from "@/lib/constants";

interface Player {
    nickname: string;
    worth: number;
    bet?: number;
    disconnected: boolean;
};

export default function Page() {
    const { isHandshakeComplete } = useNickname();
    const [worth, setWorth] = useState<number | undefined>(undefined);
    const [cash, setCash] = useState<number | undefined>(undefined);
    const [bet, setBet] = useState<number | undefined>(undefined);
    const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);

    useEffect(() => {
        if (!isHandshakeComplete) {
            return;
        }

        socket.emit("join room");

        function joinedRoom(cash: number) {
            setWorth(cash);
            setCash(cash);
        }

        function userJoined(nickname: string, worth?: number, bet?: number) {
            setOtherPlayers(prev => [...prev, {
                nickname,
                worth: worth!,
                bet: bet,
                disconnected: false
            }]);
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

        function userChangeBet(nickname: string, bet: number) {
            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === nickname
                        ? { ...player, bet }
                        : player
                )
            );
        }

        socket.on("joined room", joinedRoom);
        socket.on("user joined", userJoined);
        socket.on("user reconnected", userReconnected);
        socket.on("user disconnected", userDisconnected);
        socket.on("user removed", userRemoved);
        socket.on("user change bet", userChangeBet);

        return () => {
            socket.off("joined room", joinedRoom);
            socket.off("user joined", userJoined);
            socket.off("user reconnected", userReconnected);
            socket.off("user disconnected", userDisconnected);
            socket.off("user removed", userRemoved);
            socket.off("user change bet", userChangeBet);
        }
    }, [isHandshakeComplete]);

    let chips = [0, 0, 0, 0, 0];
    if (cash) {
        chips = convertToChips(cash);
    }

    let betChips = [0, 0, 0, 0, 0];
    if (bet) {
        betChips = convertToChips(bet);
    }

    function convertToChips(cashAmount: number) {
        let chips = [0, 0, 0, 0, 0];

        for (let i = CHIPS.length - 1; i >= 0; i--) {
            while (cashAmount / CHIPS[i] >= 1) {
                chips[i] += 1;
                cashAmount -= CHIPS[i];
            }
        }

        if (cashAmount == 1) {
            chips[0] += 1;
            cashAmount -= 1;
        }

        return chips;
    }

    function addBet(index: number) {
        if (chips[index] > 0) {
            setCash(prev => prev! - CHIPS[index]);
            setBet(prev => (prev ?? 0) + CHIPS[index]);
            socket.emit("change bet", index, "add");
        }
    }

    function removeBet(index: number) {
        if (betChips[index] > 0) {
            setCash(prev => prev! + CHIPS[index]);
            setBet(prev => prev! - CHIPS[index]);
            socket.emit("change bet", index, "remove");
        }
    }

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
                        You {worth && <>({worth} / {cash})</>}
                    </h2>
                    <div className="flex gap-1.5">
                        <div className="flex flex-col gap-2">
                            <Chip color="white" amount={chips[0]} />
                            <button
                                onClick={() => addBet(0)}
                                className={`${chips[0] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(0)}
                                className={`${betChips[0] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="red" amount={chips[1]} />
                            <button
                                onClick={() => addBet(1)}
                                className={`${chips[1] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(1)}
                                className={`${betChips[1] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="green" amount={chips[2]} />
                            <button
                                onClick={() => addBet(2)}
                                className={`${chips[2] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(2)}
                                className={`${betChips[2] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="black" amount={chips[3]} />
                            <button
                                onClick={() => addBet(3)}
                                className={`${chips[3] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(3)}
                                className={`${betChips[3] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="blue" amount={chips[4]} />
                            <button
                                onClick={() => addBet(4)}
                                className={`${chips[4] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(4)}
                                className={`${betChips[4] === 0 ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="bg-[#daa52080] rounded-full size-36 border-4 border-[#DAA520]">
                        <div className="flex justify-center items-center h-full">
                            <Chip color="white" amount={betChips[0]} />
                            <Chip color="red" amount={betChips[1]} />
                            <Chip color="green" amount={betChips[2]} />
                            <Chip color="black" amount={betChips[3]} />
                            <Chip color="blue" amount={betChips[4]} />
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

                {otherPlayers.length > 0 &&
                    <div className="flex flex-col items-center gap-2">
                        <h2 className="text-white italic font-semibold">
                            {otherPlayers[0].nickname} ({otherPlayers[0].worth})
                        </h2>
                        <div className="bg-[#daa52039] rounded-full size-36">
                            <div className="flex justify-center items-center h-full">
                                {(() => {
                                    const playerBetChips = otherPlayers[0].bet
                                        ? convertToChips(otherPlayers[0].bet)
                                        : [0, 0, 0, 0, 0];
                                    return (
                                        <>
                                            <Chip color="white" amount={playerBetChips[0]} />
                                            <Chip color="red" amount={playerBetChips[1]} />
                                            <Chip color="green" amount={playerBetChips[2]} />
                                            <Chip color="black" amount={playerBetChips[3]} />
                                            <Chip color="blue" amount={playerBetChips[4]} />
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                }

                {otherPlayers.length > 1 &&
                    <div className="flex flex-col items-center gap-2">
                        <h2 className="text-white italic font-semibold">
                            {otherPlayers[1].nickname} ({otherPlayers[1].worth})
                        </h2>
                        <div className="bg-[#daa52039] rounded-full size-36">
                            <div className="flex justify-center items-center h-full">
                                {(() => {
                                    const playerBetChips = otherPlayers[1].bet
                                        ? convertToChips(otherPlayers[1].bet)
                                        : [0, 0, 0, 0, 0];
                                    return (
                                        <>
                                            <Chip color="white" amount={playerBetChips[0]} />
                                            <Chip color="red" amount={playerBetChips[1]} />
                                            <Chip color="green" amount={playerBetChips[2]} />
                                            <Chip color="black" amount={playerBetChips[3]} />
                                            <Chip color="blue" amount={playerBetChips[4]} />
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}