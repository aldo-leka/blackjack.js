"use client";

import Chip from "@/components/Chip";
import { socket } from "@/lib/socket";
import { Check, CirclePlus, Hand, Repeat, Split } from "lucide-react";
import { useEffect, useState } from "react";
import { useNickname } from "@/contexts/NicknameContext";
import { Card, CHIPS, DECK } from "@/lib/util";
import Image from "next/image";

interface Player {
    nickname: string;
    countryCode: string;
    worth: number;
    bet?: number;
    check?: boolean;
    hand?: Card[];
    disconnected: boolean;
};

interface ApiPlayer {
    nickname: string;
    countryCode: string;
    cash?: number;
    bet?: number;
    check?: boolean;
    hand?: ApiCard[]
}

interface ApiRoom {
    name: string;
    players: ApiPlayer[];
    timeLeft?: number;
    phase?: "bet" | "deal_initial_cards" | "players_play" | "dealer_plays" | "payout";
    dealerHand?: ApiCard[];
    currentPlayerIndex?: number;
}

interface ApiCard {
    rank: string;
    suit: string;
}

export default function Page() {
    const { nickname, isHandshakeComplete } = useNickname();
    const [worth, setWorth] = useState<number | undefined>(undefined);
    const [bet, setBet] = useState<number | undefined>(undefined);
    const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
    // const [otherPlayers, setOtherPlayers] = useState<Player[]>([
    //     {
    //         nickname: "FartyPlayer",
    //         countryCode: "somewhere",
    //         worth: 120,
    //         bet: 10,
    //         check: true,
    //         disconnected: false,
    //     },
    //     {
    //         nickname: "Partypooper",
    //         countryCode: "somewhere",
    //         worth: 100,
    //         bet: 80,
    //         disconnected: true,
    //     }
    // ]);
    const [timeLeft, setTimeLeft] = useState<number | undefined>();
    const [totalTime, setTotalTime] = useState<number | undefined>();
    const [phase, setPhase] = useState<"bet" | "deal_initial_cards" | "players_play" | "dealer_plays" | "payout">();
    const [hand, setHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);

    useEffect(() => {
        if (!isHandshakeComplete) {
            return;
        }

        socket.emit("join room");

        function joinedRoom(me: ApiPlayer, room: ApiRoom) {
            setWorth(me.cash);
            setPhase(room.phase!);

            const otherPlayers = room.players
                .filter(p => p.nickname !== me.nickname)
                .map(p => getPlayerMap(p));

            setOtherPlayers(otherPlayers);
            setDealerHand(room.dealerHand?.map(c => getCard(c)) ?? []);

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

        function userReconnected(username: string) {
            console.log(`userReconnected: ${username} reconnected`);
            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === username
                        ? { ...player, disconnected: false }
                        : player
                )
            );
        }

        function userDisconnected(username: string) {
            console.log(`userDisconnected: ${username} disconnected`);
            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === username
                        ? { ...player, disconnected: true }
                        : player
                )
            );
        }

        function userRemoved(username: string) {
            console.log(`userRemoved: ${username} removed`);
            setOtherPlayers(prev =>
                prev.filter(player => player.nickname !== username)
            );
        }

        function userChangeBet(username: string, bet: number) {
            console.log(`userChangeBet: user: ${username}, bet: ${bet}`);
            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === username
                        ? { ...player, bet }
                        : player
                )
            );
        }

        function alreadyInRoom(me: ApiPlayer, room: ApiRoom) {
            const otherPlayers = room.players
                .filter(p => p.nickname !== me.nickname)
                .map(p => getPlayerMap(p));

            setWorth(me.cash);
            setBet(me.bet);
            setOtherPlayers(otherPlayers);
            setPhase(room.phase!);
            setHand(me.hand?.map(c => getCard(c)) ?? []);
            setDealerHand(room.dealerHand?.map(c => getCard(c)) ?? []);

            console.log(`alreadyInRoom: cash: ${me.cash}, bet: ${me.bet}, other players: ${JSON.stringify(otherPlayers)}`);
        }

        function timerUpdate(timeLeft: number, totalTime: number) {
            setTimeLeft(timeLeft);
            setTotalTime(totalTime);
        }

        function dealInitialCards() {
            setPhase("deal_initial_cards");
        }

        function dealPlayerCard(username: string, card: ApiCard) {
            console.log(`dealPlayerCard: for ${username}, card: ${JSON.stringify(card)}`);

            if (username === nickname) {
                setHand(prev => [
                    ...prev,
                    getCard(card)
                ]);

                return;
            }

            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === username
                        ? {
                            ...player,
                            hand: [
                                ...(player.hand || []),
                                getCard(card)
                            ]
                        }
                        : player
                )
            );
        }

        function dealDealerFacedownCard() {
            setDealerHand([{
                rank: "facedown",
                suit: "card",
                imageUrl: "/images/card back red.png",
                alt: "Facedown playing card",
            }]);
        }

        function dealDealerCard(card: ApiCard) {
            setDealerHand(prev => [
                ...prev,
                getCard(card)
            ]);
        }

        function restart(room: ApiRoom) {
            console.log(`no bets, restarting game, room: ${JSON.stringify(room)}`);
            setPhase(room.phase!);

            const otherPlayers = room.players
                .filter(p => p.nickname !== nickname)
                .map(p => getPlayerMap(p));

            setOtherPlayers(otherPlayers);
        }

        function playerTurn(username: string) {

        }

        function getPlayerMap(player: ApiPlayer) {
            return {
                nickname: player.nickname,
                countryCode: player.countryCode,
                worth: player.cash!,
                bet: player.bet,
                check: player.check,
                hand: player.hand?.map(c => getCard(c)),
                disconnected: false
            };
        }

        function getCard(card: ApiCard) {
            return DECK.find(c => c.rank === card.rank && c.suit === card.suit)!;
        }

        socket.on("joined room", joinedRoom);
        socket.on("user joined", userJoined);
        socket.on("user reconnected", userReconnected);
        socket.on("user disconnected", userDisconnected);
        socket.on("user removed", userRemoved);
        socket.on("user change bet", userChangeBet);
        socket.on("already in room", alreadyInRoom);
        socket.on("timer update", timerUpdate);
        socket.on("deal initial cards", dealInitialCards);
        socket.on("deal player card", dealPlayerCard);
        socket.on("deal dealer facedown card", dealDealerFacedownCard);
        socket.on("deal dealer card", dealDealerCard);
        socket.on("restart", restart);
        socket.on("player turn", playerTurn);

        return () => {
            socket.off("joined room", joinedRoom);
            socket.off("user joined", userJoined);
            socket.off("user reconnected", userReconnected);
            socket.off("user disconnected", userDisconnected);
            socket.off("user removed", userRemoved);
            socket.off("user change bet", userChangeBet);
            socket.off("already in room", alreadyInRoom);
            socket.off("timer update", timerUpdate);
            socket.off("deal initial cards", dealInitialCards);
            socket.off("deal card", dealPlayerCard);
            socket.off("deal dealer facedown card", dealDealerFacedownCard);
            socket.off("deal dealer card", dealDealerCard);
            socket.off("restart", restart);
            socket.off("player turn", playerTurn);
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
                {getDealerComponent()}
            </div>

            <div id="player-zone" className="col-span-2 grid grid-cols-2 gap-8 px-8">
                <div className="flex flex-col items-center gap-2 justify-self-end">
                    <h2 className="text-white italic font-semibold">
                        You {worth && <>(${worth})</>}
                    </h2>
                    {phase !== "bet" && <div>
                        <div className="relative h-24 w-32">
                            {hand.map((card, index) =>
                                <div key={`player-${card.rank}+${card.suit}`} className={`absolute ${index > 0 ? "left-4" : ""}`}>
                                    <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                </div>
                            )}
                        </div>
                        <div className="text-white italic font-semibold">
                            21 <span className="text-[#DAA520] not-italic font-light">
                                Blackjack!
                            </span>
                        </div>
                    </div>}
                    {phase === "bet" && <div className="flex gap-1.5">
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
                    </div>}
                </div>

                <div className="flex flex-col items-center gap-2 justify-self-start">
                    <div className="relative size-36">
                        {phase === "bet" && totalTime && timeLeft ? (
                            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 144 144">
                                <circle
                                    cx="72"
                                    cy="72"
                                    r="70"
                                    fill="none"
                                    stroke="#DAA520"
                                    strokeWidth="4"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 * Math.PI * 70 * (timeLeft / totalTime)}`}
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
                        {phase !== "bet" &&
                            <>
                                <button
                                    className="px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]"
                                >
                                    <CirclePlus size={16} />
                                </button>
                                <button
                                    className="px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]"
                                >
                                    <Hand size={16} />
                                </button>
                                <button
                                    className="px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]"
                                >
                                    <Split size={16} />
                                </button>
                            </>
                        }
                        {phase === "bet" &&
                            <>
                                <button
                                    className="px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]"
                                >
                                    <Repeat size={16} />
                                </button>
                                <button
                                    className="px-2 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]"
                                >
                                    2X
                                </button>
                                <button
                                    onClick={() => {
                                        if (bet && bet > 0) {
                                            socket.emit("check");
                                        }
                                    }}
                                    className={`${!bet || bet === 0 ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                >
                                    <Check size={16} />
                                </button>
                            </>
                        }
                    </div>
                </div>
            </div>

            <div id="other-players" className="col-span-2 grid grid-cols-2 gap-8 px-8">
                <div className="justify-self-end">
                    {getOtherPlayerComponent(0)}
                </div>

                <div className="justify-self-start">
                    {getOtherPlayerComponent(1)}
                </div>
            </div>

            <div id="chat" className="col-span-2">

            </div>
        </div>
    );

    function getDealerComponent() {
        return <div className="flex flex-col items-center">
            <div className="flex w-full justify-center">
                <div className="w-1/5"></div>
                <div className="flex flex-col items-center justify-center size-48 -mt-24 bg-[#daa52080] rounded-full">
                    <div className="mt-24 text-white font-semibold italic">
                        Dealer
                    </div>
                    <div className="relative h-24 w-32 mt-6"> 
                        {dealerHand.map((card, index) =>
                            <div key={`dealer-${card.rank}+${card.suit}`} className={`absolute ${index > 0 ? "left-4" : ""}`}>
                                <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                            </div>
                        )}
                    </div>
                    <div className="text-white italic font-semibold">
                        21 <span className="text-[#DAA520] not-italic font-light">
                            Blackjack!
                        </span>
                    </div>
                </div>

                <div className="w-1/5 text-[#DAA520] text-center cursor-pointer">
                    <div>
                        X
                    </div>
                    <div>
                        Quit
                    </div>
                </div>
            </div>
            {/* {phase === "bet" && */}

            <div className="text-white italic font-semibold">
                Place your bets
            </div>
            {/* } */}
        </div>
    }

    function getOtherPlayerComponent(playerIndex: number) {
        if (otherPlayers.length > playerIndex) {
            const otherPlayer = otherPlayers[playerIndex];

            return <div className={`${otherPlayer.disconnected ? "opacity-50" : ""} flex flex-col items-center gap-2`}>
                <h2 className="text-white italic font-semibold">
                    {otherPlayer.nickname} (${otherPlayer.worth})
                </h2>
                {phase !== "bet" &&
                    <div className="flex flex-col items-start">
                        <div className="text-white italic">
                            {otherPlayer.bet ? `$${otherPlayer.bet}` : ''}
                        </div>
                        <div className="relative h-24 w-32">
                            {otherPlayer.hand && otherPlayer.hand.map((card, index) =>
                                <div key={`other-player-1-${card.rank}+${card.suit}`} className={`absolute ${index > 0 ? "left-4" : ""}`}>
                                    <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                </div>
                            )}
                        </div>
                        <div className="text-white italic font-semibold">
                            22 <span className="text-[#DAA520] not-italic font-light">
                                Bust!
                            </span>
                        </div>
                    </div>
                }
                {phase === "bet" &&
                    <div className="grid grid-rows-3 bg-[#daa52039] rounded-full size-36">
                        <div className="flex justify-center items-end text-white italic font-semibold pb-1">
                            {otherPlayer.bet ? `$${otherPlayer.bet}` : ''}
                        </div>
                        <div className="flex justify-center items-center h-full">
                            {(() => {
                                const playerBetChips = otherPlayer.bet
                                    ? convertToChips(otherPlayer.bet)
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
                        <div className="flex justify-center text-white">
                            {otherPlayer.check ? <Check size={16} /> : ""}
                        </div>
                    </div>
                }
            </div>;
        }

        return <></>;
    }
}