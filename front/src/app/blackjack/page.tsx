"use client";

import Chip from "@/components/Chip";
import { socket } from "@/lib/socket";
import { Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import { useNickname } from "@/contexts/NicknameContext";
import { CHIPS } from "@/lib/util";
import Image from "next/image";

interface Player {
    nickname: string;
    countryCode: string;
    worth: number;
    bet?: number;
    disconnected: boolean;
};

interface ApiPlayer {
    nickname: string;
    countryCode: string;
    cash?: number;
    bet?: number;
}

interface ApiRoom {
    name: string;
    players: ApiPlayer[];
    timeLeft?: number;
    phase?: "bet" | "deal_initial_cards" | "players_play" | "dealer_play" | "payout";
}

export default function Page() {
    const { isHandshakeComplete } = useNickname();
    const [worth, setWorth] = useState<number | undefined>(undefined);
    const [bet, setBet] = useState<number | undefined>(undefined);
    // const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
    const [otherPlayers, setOtherPlayers] = useState<Player[]>([
        {
            nickname: "FartyPlayer",
            countryCode: "somewhere",
            worth: 120,
            bet: 10,
            disconnected: false,
        },
        {
            nickname: "Partypooper",
            countryCode: "somewhere",
            worth: 100,
            bet: 80,
            disconnected: true,
        }
    ]);
    const [timeLeft, setTimeLeft] = useState<number | undefined>();
    const [totalTime, setTotalTime] = useState<number | undefined>();
    const [phase, setPhase] = useState<"bet" | "deal_initial_cards" | "players_play" | "dealer_play" | "payout">("players_play");

    useEffect(() => {
        if (!isHandshakeComplete) {
            return;
        }

        socket.emit("join room");

        function joinedRoom(me: ApiPlayer, room: ApiRoom) {
            setWorth(me.cash);

            const otherPlayers = room.players
                .filter(p => p.nickname !== me.nickname)
                .map(p => ({
                    nickname: p.nickname,
                    countryCode: p.countryCode,
                    worth: p.cash!,
                    bet: p.bet,
                    disconnected: false
                }));

            setOtherPlayers(otherPlayers);

            console.log(`joinedRoom: i joined room with cash ${me.cash}, other players: ${JSON.stringify(otherPlayers)}`);
        }

        function userJoined(player: ApiPlayer) {
            console.log(`userJoined: ${player.nickname} joined, countryCode: ${player.countryCode}, worth: ${player.cash}`);
            setOtherPlayers(prev => {
                const exists = prev.some(p => p.nickname === player.nickname);
                if (exists) {
                    return prev;
                }
                return [...prev, {
                    nickname: player.nickname,
                    countryCode: player.countryCode,
                    worth: player.cash!,
                    bet: player.bet,
                    disconnected: false
                }];
            });
        }

        function userReconnected(nickname: string) {
            console.log(`userReconnected: ${nickname} reconnected`);
            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === nickname
                        ? { ...player, disconnected: false }
                        : player
                )
            );
        }

        function userDisconnected(nickname: string) {
            console.log(`userDisconnected: ${nickname} disconnected`);
            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === nickname
                        ? { ...player, disconnected: true }
                        : player
                )
            );
        }

        function userRemoved(nickname: string) {
            console.log(`userRemoved: ${nickname} removed`);
            setOtherPlayers(prev =>
                prev.filter(player => player.nickname !== nickname)
            );
        }

        function userChangeBet(nickname: string, bet: number) {
            console.log(`userChangeBet: user: ${nickname}, bet: ${bet}`);
            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === nickname
                        ? { ...player, bet }
                        : player
                )
            );
        }

        function alreadyInRoom(me: ApiPlayer, room: ApiRoom) {
            const otherPlayers = room.players
                .filter(p => p.nickname !== me.nickname)
                .map(p => ({
                    nickname: p.nickname,
                    countryCode: p.countryCode,
                    worth: p.cash!,
                    bet: p.bet,
                    disconnected: false
                }));

            setWorth(me.cash);
            setBet(me.bet);
            // setOtherPlayers(otherPlayers);

            console.log(`alreadyInRoom: cash: ${me.cash}, bet: ${me.bet}, other players: ${JSON.stringify(otherPlayers)}`);
        }

        function timerUpdate(timeLeft: number, totalTime: number) {
            setTimeLeft(timeLeft);
            setTotalTime(totalTime);
        }

        socket.on("joined room", joinedRoom);
        socket.on("user joined", userJoined);
        socket.on("user reconnected", userReconnected);
        socket.on("user disconnected", userDisconnected);
        socket.on("user removed", userRemoved);
        socket.on("user change bet", userChangeBet);
        socket.on("already in room", alreadyInRoom);
        socket.on("timer update", timerUpdate);

        return () => {
            socket.off("joined room", joinedRoom);
            socket.off("user joined", userJoined);
            socket.off("user reconnected", userReconnected);
            socket.off("user disconnected", userDisconnected);
            socket.off("user removed", userRemoved);
            socket.off("user change bet", userChangeBet);
            socket.off("already in room", alreadyInRoom);
            socket.off("timer update", timerUpdate);
        }
    }, [isHandshakeComplete]);

    const cash = (worth ?? 0) - (bet ?? 0);

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
        if (CHIPS[index] <= cash) {
            setBet(prev => (prev ?? 0) + CHIPS[index]);
            socket.emit("change bet", index, "add");
        }
    }

    function removeBet(index: number) {
        if (bet && CHIPS[index] <= bet) {
            setBet(prev => prev! - CHIPS[index]);
            socket.emit("change bet", index, "remove");
        }
    }

    return (
        <div className="grid grid-rows-4 grid-cols-2 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen select-none">
            <div id="dealer-zone" className="col-span-2">
                <div className="flex flex-col items-center">
                    <div className="w-full max-w-7xl px-12 grid grid-cols-3">
                        <div></div>
                        <div className="relative bg-[#daa52080] rounded-full size-48 -mt-24 flex items-center justify-center">
                            <div className="absolute text-white font-semibold italic mt-8">
                                Dealer
                            </div>
                            <div className="relative h-24 w-32 -bottom-25">
                                <div className="absolute">
                                    <Image src="/images/card back red.png" alt="" width={60} height={87} />
                                </div>
                                <div className="absolute left-4">
                                    <Image src="/images/2_of_clubs.png" alt="" width={60} height={87} />
                                </div>
                            </div>
                        </div>
                        <div className="text-[#DAA520] text-center cursor-pointer ml-8">
                            <div>
                                X
                            </div>
                            <div>
                                Quit
                            </div>
                        </div>
                    </div>
                    {
                        phase === "bet" &&
                        <div className="text-white italic font-semibold mt-12">
                            Place your bets
                        </div>
                    }
                </div>
            </div>

            <div id="player-zone" className="col-span-2 grid grid-cols-2 gap-8 px-8">
                <div className="flex flex-col items-center gap-2 justify-self-end">
                    <h2 className="text-white italic font-semibold">
                        You {worth && <>(${worth})</>}
                    </h2>
                    <div className="flex gap-1.5">
                        <div className="flex flex-col gap-2">
                            <Chip color="white" amount={CHIPS[0]} />
                            <button
                                onClick={() => addBet(0)}
                                className={`${CHIPS[0] > cash ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(0)}
                                className={`${!bet || (bet < CHIPS[0]) ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="red" amount={CHIPS[1]} />
                            <button
                                onClick={() => addBet(1)}
                                className={`${CHIPS[1] > cash ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(1)}
                                className={`${!bet || (bet < CHIPS[1]) ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="green" amount={CHIPS[2]} />
                            <button
                                onClick={() => addBet(2)}
                                className={`${CHIPS[2] > cash ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(2)}
                                className={`${!bet || (bet < CHIPS[2]) ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="black" amount={CHIPS[3]} />
                            <button
                                onClick={() => addBet(3)}
                                className={`${CHIPS[3] > cash ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(3)}
                                className={`${!bet || (bet < CHIPS[3]) ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Chip color="blue" amount={CHIPS[4]} />
                            <button
                                onClick={() => addBet(4)}
                                className={`${CHIPS[4] > cash ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(4)}
                                className={`${!bet || (bet < CHIPS[4]) ? "opacity-50" : ""} bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 justify-self-start">
                    <div className="relative size-36">
                        {totalTime && timeLeft ? (
                            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 144 144">
                                <circle
                                    cx="72"
                                    cy="72"
                                    r="70"
                                    fill="none"
                                    stroke="#DAA520"
                                    strokeWidth="4"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - (totalTime - timeLeft) / totalTime)}`}
                                    className="transition-all duration-1000 ease-linear"
                                />
                            </svg>
                        ) : ''}

                        <div className="grid grid-rows-3 bg-[#daa52080] rounded-full size-36 border-4 border-transparent">
                            <div className="flex justify-center items-end text-white italic font-semibold pb-1">
                                {bet ? `$${bet}` : ''}
                            </div>
                            <div className="flex justify-center items-center">
                                <Chip color="white" amount={betChips[0]} />
                                <Chip color="red" amount={betChips[1]} />
                                <Chip color="green" amount={betChips[2]} />
                                <Chip color="black" amount={betChips[3]} />
                                <Chip color="blue" amount={betChips[4]} />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-between">
                        <button className="px-2 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]">
                            <Repeat size={16} />
                        </button>
                        <button
                            className="px-2 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]"
                        >
                            2X
                        </button>
                    </div>
                </div>
            </div>

            <div id="other-players" className="col-span-2 grid grid-cols-2 gap-8 px-8">
                <div className="justify-self-end">
                    {otherPlayers.length > 0 &&
                        <div className={`${otherPlayers[0].disconnected ? "opacity-50" : ""} flex flex-col items-center gap-2`}>
                            <h2 className="text-white italic font-semibold">
                                {otherPlayers[0].nickname} (${otherPlayers[0].worth})
                            </h2>
                            <div className="grid grid-rows-3 bg-[#daa52039] rounded-full size-36">
                                <div className="flex justify-center items-end text-white italic font-semibold pb-1">
                                    {otherPlayers[0].bet ? `$${otherPlayers[0].bet}` : ''}
                                </div>
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
                </div>

                <div className="justify-self-start">
                    {otherPlayers.length > 1 &&
                        <div className={`${otherPlayers[1].disconnected ? "opacity-50" : ""} flex flex-col items-center gap-2`}>
                            <h2 className="text-white italic font-semibold">
                                {otherPlayers[1].nickname} (${otherPlayers[1].worth})
                            </h2>
                            <div className="grid grid-rows-3 bg-[#daa52039] rounded-full size-36">
                                <div className="flex justify-center items-end text-white italic font-semibold pb-1">
                                    {otherPlayers[1].bet ? `$${otherPlayers[1].bet}` : ''}
                                </div>
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

            <div id="chat" className="col-span-2">

            </div>
        </div>
    )
}