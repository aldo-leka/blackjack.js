"use client";

import Chip from "@/components/Chip";
import { socket } from "@/lib/socket";
import { Check, Currency, Hand, Plus, Repeat, Split, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNickname } from "@/contexts/NicknameContext";
import { Card, CHIPS, DECK, HandValue } from "@/lib/util";
import Image from "next/image";

interface Player {
    nickname: string;
    countryCode: string;
    worth: number;
    bet?: number;
    betBefore?: number;
    check?: boolean;
    stand?: boolean;
    hand?: Card[];
    handValue?: HandValue;
    disconnected: boolean;
};

interface ApiPlayer {
    nickname: string;
    countryCode: string;
    cash?: number;
    bet?: number;
    betBefore?: number;
    check?: boolean;
    stand?: boolean;
    hand?: ApiCard[]
    handValue: HandValue;
    disconnected: boolean;
}

type Phase = "bet" | "deal_initial_cards" | "players_turn" | "dealers_turn" | "payout";

interface ApiRoom {
    name: string;
    players: ApiPlayer[];
    timeLeft?: number;
    phase?: Phase;
    dealerHand?: ApiCard[];
    currentPlayer?: ApiPlayer;
}

interface ApiCard {
    rank: string;
    suit: string;
}

// TODO If dealer has blackjack, reveal immediately?
// if dealer's face up card is a 10, J, Q, K, Ace he checks his
// face down card, and reveals a blackjack instantly.
// players don't play their round in that case.
// only players who also have blackjack push, otherwise lose.
export default function Page() {
    const { nickname, isHandshakeComplete } = useNickname();
    const [worth, setWorth] = useState<number>();
    const [bet, setBet] = useState<number>();
    const [betBefore, setBetBefore] = useState<number>();
    const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
    const [timeLeft, setTimeLeft] = useState<number>();
    const [totalTime, setTotalTime] = useState<number>();
    const [phase, setPhase] = useState<Phase>();
    const [hand, setHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [dealerHandValue, setDealerHandValue] = useState<HandValue>();
    const [status, setStatus] = useState("");
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [handValue, setHandValue] = useState<HandValue>();
    const [check, setCheck] = useState<boolean>();
    const [stand, setStand] = useState<boolean>();

    useEffect(() => {
        if (!isHandshakeComplete) {
            return;
        }

        socket.emit("join room");

        function joinedRoom(me: ApiPlayer, room: ApiRoom) {
            setWorth(me.cash);
            setPhase(room.phase!);
            setStatus(getStatus(room.phase!));

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
                    disconnected: false,
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

        function userCheck(username: string) {
            console.log(`userCheck: user: ${username}`);
            setOtherPlayers(prev =>
                prev.map(player =>
                    player.nickname === username
                        ? { ...player, check: true }
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
            setBetBefore(me.betBefore);
            setOtherPlayers(otherPlayers);
            setPhase(room.phase!);

            const isMyTurn = room.currentPlayer?.nickname === nickname;
            setStatus(getStatus(room.phase!, isMyTurn));
            setIsMyTurn(isMyTurn);
            setHand(me.hand?.map(c => getCard(c)) ?? []);
            setDealerHand(room.dealerHand?.map(c => getCard(c)) ?? []);
            setHandValue(me.handValue);

            console.log(`alreadyInRoom: cash: ${me.cash}, bet: ${me.bet}, other players: ${JSON.stringify(otherPlayers)}`);
        }

        function timerUpdate(timeLeft: number, totalTime: number) {
            setTimeLeft(timeLeft);
            setTotalTime(totalTime);
        }

        function dealInitialCards(room: ApiRoom) {
            setPhase(room.phase!);
            setStatus(getStatus(room.phase!));
        }

        function dealPlayerCard(player: ApiPlayer, card: ApiCard) {
            console.log(`dealPlayerCard: for ${player.nickname}, card: ${JSON.stringify(card)}`);

            if (player.nickname === nickname) {
                setHand(prev => [
                    ...prev,
                    getCard(card)
                ]);

                setHandValue(player.handValue);
                setBetBefore(player.betBefore);

                return;
            }

            setOtherPlayers(prev =>
                prev.map(p =>
                    p.nickname === player.nickname
                        ? {
                            ...p,
                            hand: [
                                ...(p.hand || []),
                                getCard(card)
                            ],
                            handValue: player.handValue
                        }
                        : p
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

        function dealDealerCard(card: ApiCard, handValue: HandValue) {
            setDealerHand(prev => [
                ...prev,
                getCard(card)
            ]);

            setDealerHandValue(handValue);
        }

        function restart(room: ApiRoom) {
            console.log(`restarting game, room: ${JSON.stringify(room)}`);
            setPhase(room.phase!);
            setStatus(getStatus(room.phase!));

            const otherPlayers = room.players
                .filter(p => p.nickname !== nickname)
                .map(p => getPlayerMap(p));

            setOtherPlayers(otherPlayers);

            setBet(undefined);
            setHand([]);
            setHandValue(undefined);
            setDealerHand([]);
            setDealerHandValue(undefined);
            setIsMyTurn(false);
            setCheck(false);
            setStand(false);
        }

        function playersTurn(room: ApiRoom) {
            setPhase(room.phase!);
            setStatus(getStatus(room.phase!));
        }

        function playerTurn(player: ApiPlayer) {
            const isMyTurn = player.nickname === nickname;
            setIsMyTurn(isMyTurn);
            setStatus(getStatus("players_turn", isMyTurn));
            setStand(player.stand);
        }

        function dealerPlays(room: ApiRoom) {
            setPhase(room.phase!);
            setStatus(getStatus(room.phase!));
        }

        function revealDealerCard(card: ApiCard, handValue: HandValue) {
            setDealerHand(prev => [
                getCard(card),
                ...prev.slice(1)
            ]);

            setDealerHandValue(handValue);
        }

        function playerResult(playerNickname: string, result: "win" | "lose" | "push" | "blackjack", winAmount: number, newCash: number) {
            console.log(`playerResult: ${playerNickname} ${result} with amount ${winAmount}, new cash: ${newCash}`);

            if (playerNickname === nickname) {
                setWorth(newCash);
            } else {
                setOtherPlayers(prev =>
                    prev.map(p =>
                        p.nickname === playerNickname
                            ? { ...p, worth: newCash }
                            : p
                    )
                );
            }
        }

        function getPlayerMap(player: ApiPlayer) {
            return {
                nickname: player.nickname,
                countryCode: player.countryCode,
                worth: player.cash!,
                bet: player.bet,
                betBefore: player.betBefore,
                check: player.check,
                stand: player.stand,
                hand: player.hand?.map(c => getCard(c)),
                handValue: player.handValue,
                disconnected: player.disconnected,
            };
        }

        function getCard(card: ApiCard) {
            return DECK.find(c => c.rank === card.rank && c.suit === card.suit)!;
        }

        function getStatus(phase: Phase, isMyTurn: boolean = false) {
            switch (phase) {
                case "bet":
                    return "Place your bets";
                case "deal_initial_cards":
                    return "Dealing initial cards";
                case "players_turn":
                    return isMyTurn ? "Play your hand" : "Wait for your turn";
                case "dealers_turn":
                    return "Waiting for the dealer";
                case "payout":
                    return "Payout time";
            };
        }

        socket.on("joined room", joinedRoom);
        socket.on("user joined", userJoined);
        socket.on("user reconnected", userReconnected);
        socket.on("user disconnected", userDisconnected);
        socket.on("user removed", userRemoved);
        socket.on("user change bet", userChangeBet);
        socket.on("user check", userCheck);
        socket.on("already in room", alreadyInRoom);
        socket.on("timer update", timerUpdate);
        socket.on("deal initial cards", dealInitialCards);
        socket.on("deal player card", dealPlayerCard);
        socket.on("deal dealer facedown card", dealDealerFacedownCard);
        socket.on("deal dealer card", dealDealerCard);
        socket.on("restart", restart);
        socket.on("players turn", playersTurn);
        socket.on("player turn", playerTurn);
        socket.on("dealer plays", dealerPlays);
        socket.on("reveal dealer card", revealDealerCard);
        socket.on("player result", playerResult);

        return () => {
            socket.off("joined room", joinedRoom);
            socket.off("user joined", userJoined);
            socket.off("user reconnected", userReconnected);
            socket.off("user disconnected", userDisconnected);
            socket.off("user removed", userRemoved);
            socket.off("user change bet", userChangeBet);
            socket.off("user check", userCheck);
            socket.off("already in room", alreadyInRoom);
            socket.off("timer update", timerUpdate);
            socket.off("deal initial cards", dealInitialCards);
            socket.off("deal card", dealPlayerCard);
            socket.off("deal dealer facedown card", dealDealerFacedownCard);
            socket.off("deal dealer card", dealDealerCard);
            socket.off("restart", restart);
            socket.off("players turn", playersTurn);
            socket.off("player turn", playerTurn);
            socket.off("dealer plays", dealerPlays);
            socket.off("reveal dealer card", revealDealerCard);
            socket.off("player result", playerResult);
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

    const bustedOrBlackjack = handValue && typeof handValue.value === "number" && handValue.value >= 21;

    return (
        <div className="grid grid-rows-4 grid-cols-2 bg-[url(/images/table.png)] bg-cover bg-center min-h-screen select-none">
            <div id="dealer-zone" className="col-span-2">
                {getDealerComponent()}
            </div>

            <div id="player-zone" className="col-span-2 grid grid-cols-2 gap-2 px-8">
                <div className="flex flex-col items-center gap-2 justify-self-end">
                    <h2 className="flex text-white italic font-semibold">
                        You {worth ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{worth}</span> : <></>}
                    </h2>
                    {phase !== "bet" && <div>
                        <div className="relative h-24 w-32">
                            {hand.map((card, index) =>
                                <div key={`player-${index}`} className="absolute" style={{ left: `${index * 16}px` }}>
                                    <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                </div>
                            )}
                        </div>
                        <div className="text-white italic font-semibold">
                            {handValue && (typeof handValue.value === 'number'
                                ? <>{handValue.value}</>
                                : <>{handValue.value.low} / {handValue.value.high}</>)
                            } {handValue?.status && (
                                <span className="text-[#DAA520] not-italic font-light">
                                    {handValue.status}
                                </span>
                            )}
                        </div>
                    </div>}
                    {phase === "bet" && <div className="flex gap-0.5">
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="white" amount={CHIPS[0]} size={30} />
                            <button
                                onClick={() => addBet(0)}
                                className={`${CHIPS[0] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(0)}
                                className={`${!bet || (bet < CHIPS[0]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="red" amount={CHIPS[1]} size={30} />
                            <button
                                onClick={() => addBet(1)}
                                className={`${CHIPS[1] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(1)}
                                className={`${!bet || (bet < CHIPS[1]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="green" amount={CHIPS[2]} size={30} />
                            <button
                                onClick={() => addBet(2)}
                                className={`${CHIPS[2] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(2)}
                                className={`${!bet || (bet < CHIPS[2]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="black" amount={CHIPS[3]} size={30} />
                            <button
                                onClick={() => addBet(3)}
                                className={`${CHIPS[3] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(3)}
                                className={`${!bet || (bet < CHIPS[3]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="blue" amount={CHIPS[4]} size={30} />
                            <button
                                onClick={() => addBet(4)}
                                className={`${CHIPS[4] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                +
                            </button>
                            <button
                                onClick={() => removeBet(4)}
                                className={`${!bet || (bet < CHIPS[4]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}>
                                -
                            </button>
                        </div>
                    </div>}
                </div>

                <div className="flex flex-col items-center gap-2 justify-self-start">
                    <div className="relative size-42">
                        {((phase === "bet" && totalTime && timeLeft) || (phase === "players_turn" && isMyTurn && totalTime && timeLeft)) ? (
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

                        <div className="grid grid-rows-3 bg-[#daa52080] rounded-full size-42 border-4 border-transparent">
                            <div className="flex justify-center items-end text-white italic font-semibold pb-1">
                                {bet ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{bet}</span> : ''}
                            </div>
                            <div className="flex justify-center items-center">
                                <Chip color="white" amount={betChips[0]} size={30} />
                                <Chip color="red" amount={betChips[1]} size={30} />
                                <Chip color="green" amount={betChips[2]} size={30} />
                                <Chip color="black" amount={betChips[3]} size={30} />
                                <Chip color="blue" amount={betChips[4]} size={30} />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-between">
                        {phase === "players_turn" && isMyTurn &&
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        if (!stand && !bustedOrBlackjack) {
                                            socket.emit("hit");
                                        }
                                    }}
                                    className={`${stand || bustedOrBlackjack ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32] hover:bg-[#c99a1f]`}
                                    title="Hit - Draw another card"
                                >
                                    <Plus size={25} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (!stand && !bustedOrBlackjack) {
                                            setStand(true);
                                            socket.emit("stand");
                                        }
                                    }}
                                    className={`${stand || bustedOrBlackjack ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32] hover:bg-[#c99a1f]`}
                                    title="Stand - Keep current hand"
                                >
                                    <Hand size={25} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (!stand) {

                                        }
                                    }}
                                    className={`${stand ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32] hover:bg-[#c99a1f]`}
                                    title="Split — Split into two hands"
                                >
                                    <Split size={25} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (!stand) {

                                        }
                                    }}
                                    className={`${stand ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32] hover:bg-[#c99a1f]`}
                                    title="Double — Double bet, take one card"
                                >
                                    2X
                                </button>
                            </div>
                        }
                        {phase === "bet" &&
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        if (bet && bet > 0 && !check) {
                                            setCheck(true);
                                            socket.emit("check");
                                        }
                                    }}
                                    className={`${!bet || bet === 0 || check ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                    title="Ready — End turn now"
                                >
                                    <Check size={25} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (bet && bet > 0 && !check) {
                                            setBet(0);
                                            socket.emit("remove bet");
                                        }
                                    }}
                                    className={`${!bet || bet === 0 || check ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                    title="Clear Bet — Remove your bet"
                                >
                                    <X size={25} />
                                </button>
                                {worth && betBefore && worth >= betBefore ?
                                    <button
                                        onClick={() => {
                                            if (worth && betBefore && worth >= betBefore && !check) {
                                                setBet(betBefore);
                                                socket.emit("repeat bet");
                                            }
                                        }}
                                        className={`${check ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                        title="Rebet — Repeat last bet"
                                    >
                                        <Repeat size={25} />
                                    </button> : <></>
                                }
                                {worth && betBefore && worth >= betBefore * 2 ?
                                    <button
                                        onClick={() => {
                                            if (worth && betBefore && worth >= betBefore * 2 && !check) {
                                                setBet(betBefore * 2);
                                                socket.emit("double bet");
                                            }
                                        }}
                                        className={`${check ? "opacity-50" : ""} px-2 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                        title="Double Bet — Double your bet"
                                    >
                                        2X
                                    </button> : <></>
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>

            <div id="other-players" className="col-span-2 grid grid-cols-2 gap-2 px-8">
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

                <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center size-48 -mt-24 bg-[#daa52080] rounded-full">
                        <div className="mt-24 text-white font-semibold italic">
                            Dealer
                        </div>
                        <div className="relative h-24 w-32 mt-6">
                            {dealerHand.map((card, index) =>
                                <div key={`dealer-${index}`} className="absolute" style={{ left: `${index * 16}px` }}>
                                    <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-12 text-white italic font-semibold">
                        {dealerHandValue &&
                            (typeof dealerHandValue.value === 'number'
                                ? <>{dealerHandValue.value}</>
                                : <>{dealerHandValue.value.low} / {dealerHandValue.value.high}</>)
                        } {dealerHandValue?.status && (
                            <span className="text-[#DAA520] not-italic font-light">
                                {dealerHandValue.status}
                            </span>
                        )}
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
            <div className="mt-4 text-white italic font-semibold">
                {status && <>{status}</>}
            </div>
        </div>
    }

    function getOtherPlayerComponent(playerIndex: number) {
        if (otherPlayers.length > playerIndex) {
            const otherPlayer = otherPlayers[playerIndex];

            return <div className={`${otherPlayer.disconnected ? "opacity-50" : ""} flex flex-col items-center gap-2`}>
                <h2 className="flex text-white italic font-semibold">
                    {otherPlayer.nickname} {otherPlayer.worth ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{otherPlayer.worth}</span> : ''}
                </h2>
                {phase !== "bet" &&
                    <div className="flex flex-col items-start">
                        <div className="flex text-white italic">
                            {otherPlayer.bet ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{otherPlayer.bet}</span> : ''}
                        </div>
                        <div className="relative h-24 w-32">
                            {otherPlayer.hand && otherPlayer.hand.map((card, index) =>
                                <div key={`other-player-1-${index}`} className="absolute" style={{ left: `${index * 16}px` }}>
                                    <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                </div>
                            )}
                        </div>
                        <div className="text-white italic font-semibold">
                            {otherPlayer.handValue && (typeof otherPlayer.handValue.value === 'number'
                                ? <>{otherPlayer.handValue.value}</>
                                : <>{otherPlayer.handValue.value.low} / {otherPlayer.handValue.value.high}</>)
                            } {otherPlayer.handValue?.status && (
                                <span className="text-[#DAA520] not-italic font-light">
                                    {otherPlayer.handValue.status}
                                </span>
                            )}
                        </div>
                    </div>
                }
                {phase === "bet" ?
                    <div className="grid grid-rows-3 bg-[#daa52039] rounded-full size-42">
                        <div className="flex justify-center items-end text-white italic font-semibold pb-1">
                            {otherPlayer.bet ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{otherPlayer.bet}</span> : ''}
                        </div>
                        <div className="flex justify-center items-center h-full">
                            {(() => {
                                const playerBetChips = otherPlayer.bet
                                    ? convertToChips(otherPlayer.bet)
                                    : [0, 0, 0, 0, 0];
                                return (
                                    <>
                                        <Chip color="white" amount={playerBetChips[0]} size={30} />
                                        <Chip color="red" amount={playerBetChips[1]} size={30} />
                                        <Chip color="green" amount={playerBetChips[2]} size={30} />
                                        <Chip color="black" amount={playerBetChips[3]} size={30} />
                                        <Chip color="blue" amount={playerBetChips[4]} size={30} />
                                    </>
                                );
                            })()}
                        </div>
                        <div className="flex justify-center text-white">
                            {otherPlayer.check ? <Check size={30} /> : ""}
                        </div>
                    </div>
                    : <></>}
            </div>;
        }

        return <></>;
    }
}