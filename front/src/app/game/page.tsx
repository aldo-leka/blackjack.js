"use client";

import Chip from "@/components/Chip";
import { socket } from "@/lib/socket";
import { Check, Currency, Hand, Music, Plus, Repeat, Split, X, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { useNickname } from "@/contexts/NicknameContext";
import { Card, CHIPS, DECK, HandResult, HandValue } from "@/lib/util";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import Snowfall from "react-snowfall";
import radio from "@/lib/radio";

interface Player {
    nickname: string;
    countryCode: string;
    worth: number;
    bet?: number;
    bet2?: number;
    totalBet?: number;
    betBefore?: number;
    check?: boolean;
    stand?: boolean;
    stand2?: boolean;
    hand?: Card[];
    hand2?: Card[];
    handValue?: HandValue;
    hand2Value?: HandValue;
    currentHand?: number;
    winningsThisRound?: number;
    handResult?: HandResult;
    hand2Result?: HandResult;
    disconnected: boolean;
};

interface ApiPlayer {
    nickname: string;
    countryCode: string;
    cash?: number;
    bet?: number;
    bet2?: number;
    totalBet?: number;
    betBefore?: number;
    check?: boolean;
    stand?: boolean;
    stand2?: boolean;
    hand?: ApiCard[];
    hand2?: ApiCard[];
    handValue: HandValue;
    hand2Value: HandValue;
    currentHand?: number;
    winningsThisRound?: number;
    handResult?: HandResult;
    hand2Result?: HandResult;
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

export default function Page() {
    const { nickname, isHandshakeComplete } = useNickname();
    const [worth, setWorth] = useState<number>();
    const [bet, setBet] = useState<number>();
    const [bet2, setBet2] = useState<number>();
    const [totalBet, setTotalBet] = useState<number>();
    const [betBefore, setBetBefore] = useState<number>();
    const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
    const [timeLeft, setTimeLeft] = useState<number>();
    const [totalTime, setTotalTime] = useState<number>();
    const [phase, setPhase] = useState<Phase>();
    const [hand, setHand] = useState<Card[]>([]);
    const [hand2, setHand2] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [dealerHandValue, setDealerHandValue] = useState<HandValue>();
    const [status, setStatus] = useState("");
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [handValue, setHandValue] = useState<HandValue>();
    const [hand2Value, setHand2Value] = useState<HandValue>();
    const [check, setCheck] = useState<boolean>();
    const [stand, setStand] = useState<boolean>();
    const [stand2, setStand2] = useState<boolean>();
    const [currentHand, setCurrentHand] = useState<number>();
    const [isDealerRevealingCard, setIsDealerRevealingCard] = useState(false);
    const [isDealerCheckingCard, setIsDealerCheckingCard] = useState(false);
    const [currentPlayerNickname, setCurrentPlayerNickname] = useState<string>();
    const [handResult, setHandResult] = useState<HandResult>();
    const [hand2Result, setHand2Result] = useState<HandResult>();
    const [totalWinnings, setTotalWinnings] = useState<number>();
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        if (socket.connected) {
            setIsConnected(true);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
        };
    }, []);

    useEffect(() => {
        let audio: HTMLAudioElement | null = null;

        async function setupRadio() {
            try {
                const stations = await radio.searchStations({
                    tag: "christmas",
                    limit: 10,
                    order: "votes",
                    reverse: true
                });

                if (stations.length > 0) {
                    // Find a station with a working stream
                    const station = stations.find(s => s.urlResolved);
                    if (station) {
                        audio = new Audio(station.urlResolved);
                        audio.loop = false;
                        audio.volume = 0.3; // Set to 30% volume

                        // Attempt to autoplay
                        audio.play().catch(err => {
                            console.log("Autoplay prevented by browser:", err);
                        });

                        setAudioElement(audio);
                    }
                }
            } catch (error) {
                console.error("Failed to load Christmas radio:", error);
            }
        }

        setupRadio();

        return () => {
            if (audio) {
                audio.pause();
                audio.src = "";
            }
        };
    }, []);

    useEffect(() => {
        if (audioElement) {
            audioElement.muted = isMuted;
        }
    }, [isMuted, audioElement]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    useEffect(() => {
        if (!isHandshakeComplete) {
            return;
        }

        socket.emit("join room");

        function disconnected() {
            console.log(`disconnected`);
            setIsConnected(false);
        }

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
                        ? { ...player, totalBet: bet }
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
            setBet2(me.bet2);
            setTotalBet(me.totalBet);
            setBetBefore(me.betBefore);
            setOtherPlayers(otherPlayers);
            setPhase(room.phase!);

            const isMyTurn = room.currentPlayer?.nickname === nickname;
            setStatus(getStatus(room.phase!, isMyTurn));
            setIsMyTurn(isMyTurn);
            setHand(me.hand?.map(c => getCard(c)) ?? []);
            setDealerHand(room.dealerHand?.map(c => getCard(c)) ?? []);
            setHandValue(me.handValue);

            console.log(`alreadyInRoom: cash: ${me.cash}, total bet: ${me.totalBet}, other players: ${JSON.stringify(otherPlayers)}`);
        }

        function timerUpdate(timeLeft: number, totalTime: number) {
            setTimeLeft(timeLeft);
            setTotalTime(totalTime);
        }

        function dealInitialCards(room: ApiRoom) {
            setPhase(room.phase!);
            setStatus(getStatus(room.phase!));
            const me = getPlayerMap(room.players.find(p => p.nickname === nickname)!);
            console.log(`dealInitialCards: deducting bets`);

            const otherPlayers = room.players
                .filter(p => p.nickname !== nickname)
                .map(p => getPlayerMap(p));

            setOtherPlayers(otherPlayers);
            setWorth(me.worth);

        }

        function dealPlayerCard(player: ApiPlayer, card: ApiCard) {
            console.log(`dealPlayerCard: for ${player.nickname}, card: ${JSON.stringify(card)}`);

            if (player.nickname === nickname) {
                if (player.currentHand === 0) {
                    setHand(prev => [
                        ...prev,
                        getCard(card)
                    ]);
                    setHandValue(player.handValue);
                }
                else {
                    setHand2(prev => [
                        ...prev,
                        getCard(card)
                    ]);
                    setHand2Value(player.hand2Value);
                }

                setWorth(player.cash);
                setBet(player.bet);
                setBet2(player.bet2);
                setTotalBet(player.totalBet);
                setStand(player.stand);
                setStand2(player.stand2);
                setBetBefore(player.betBefore);
                setCurrentHand(player.currentHand);
                return;
            }

            setOtherPlayers(prev =>
                prev.map(p =>
                    p.nickname === player.nickname
                        ? getPlayerMap(player)
                        : p
                )
            );
        }

        function dealDealerFacedownCard() {
            setDealerHand([{
                rank: "facedown",
                suit: "card",
                value: [0],
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

        function dealerCheckBlackjack() {
            console.log(`Dealer is checking for blackjack`);
            setIsDealerCheckingCard(true);
            setStatus("Dealer checking for Blackjack");

            setTimeout(() => {
                setIsDealerCheckingCard(false);
                setStatus(getStatus(phase!));
            }, 2000);
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
            setBet2(undefined);
            setTotalBet(undefined);
            setHand([]);
            setHand2([]);
            setHandValue(undefined);
            setHand2Value(undefined);
            setCurrentHand(undefined);
            setDealerHand([]);
            setDealerHandValue(undefined);
            setIsMyTurn(false);
            setCheck(false);
            setStand(false);
            setStand2(false);
            setHandResult(undefined);
            setHand2Result(undefined);
            setTotalWinnings(undefined);
            setIsDealerCheckingCard(false);
            setIsDealerRevealingCard(false);
        }

        function playersTurn(room: ApiRoom) {
            console.log(`players turn`);
            setPhase(room.phase!);
            setStatus(getStatus(room.phase!));
        }

        function playerTurn(player: ApiPlayer) {
            console.log(`player's ${player.nickname} turn`);
            const isMyTurn = player.nickname === nickname;
            setIsMyTurn(isMyTurn);
            setStatus(getStatus("players_turn", isMyTurn));
            setCurrentPlayerNickname(player.nickname);

            if (isMyTurn) {
                setCurrentHand(player.currentHand);
                return;
            }

            setOtherPlayers(prev =>
                prev.map(p =>
                    p.nickname === player.nickname
                        ? getPlayerMap(player)
                        : p
                )
            );
        }

        function dealerPlays(room: ApiRoom) {
            console.log(`Dealer plays`);
            setPhase(room.phase!);
            setStatus(getStatus(room.phase!));
        }

        function revealDealerCard(card: ApiCard, handValue: HandValue) {
            console.log(`Revealing dealer's facedown card`);
            setIsDealerRevealingCard(true);
            setIsMyTurn(false);

            setTimeout(() => {
                setDealerHand(prev => [
                    getCard(card),
                    ...prev.slice(1)
                ]);
                setDealerHandValue(handValue);
            }, 100);

            setTimeout(() => {
                setIsDealerRevealingCard(false);
            }, 1000);
        }

        function playerSplitted(player: ApiPlayer) {
            console.log(`playerSplitted: ${JSON.stringify(player)}`);

            if (player.nickname === nickname) {
                setWorth(player.cash);
                setBet(player.bet);
                setBet2(player.bet2);
                setTotalBet(player.totalBet);
                setHand(player.hand?.map(c => getCard(c)) ?? []);
                setHandValue(player.handValue);
                setHand2(player.hand2?.map(c => getCard(c)) ?? []);
                setHand2Value(player.hand2Value);
                setCurrentHand(player.currentHand);
                return;
            }

            setOtherPlayers(prev =>
                prev.map(p =>
                    p.nickname === player.nickname
                        ? getPlayerMap(player)
                        : p
                )
            );
        }

        function playerResult(room: ApiRoom) {
            const me = getPlayerMap(room.players.find(p => p.nickname === nickname)!);
            console.log(`playerResult: ${me.handResult}, ${me.hand2Result}`);

            const otherPlayers = room.players
                .filter(p => p.nickname !== nickname)
                .map(p => getPlayerMap(p));

            setWorth(me.worth);
            setBet(me.bet);
            setBet2(me.bet2);
            setTotalBet(me.totalBet);
            setOtherPlayers(otherPlayers);
            setHandResult(me.handResult);
            setHand2Result(me.hand2Result);
            setTotalWinnings(me.winningsThisRound);
            setTimeout(() => {
                setHandResult(undefined);
                setHand2Result(undefined);
                setTotalWinnings(undefined);
            }, 3000);
        }

        function getPlayerMap(player: ApiPlayer) {
            return {
                nickname: player.nickname,
                countryCode: player.countryCode,
                worth: player.cash!,
                bet: player.bet,
                bet2: player.bet2,
                totalBet: player.totalBet,
                betBefore: player.betBefore,
                check: player.check,
                stand: player.stand,
                stand2: player.stand2,
                hand: player.hand?.map(c => getCard(c)),
                hand2: player.hand2?.map(c => getCard(c)),
                handValue: player.handValue,
                hand2Value: player.hand2Value,
                currentHand: player.currentHand,
                winningsThisRound: player.winningsThisRound,
                handResult: player.handResult,
                hand2Result: player.hand2Result,
                disconnected: player.disconnected,
            };
        }

        function getCard(card: ApiCard) {
            return DECK.find(c => c.rank === card.rank && c.suit === card.suit)!;
        }

        function getStatus(phase: Phase, isMyTurn: boolean = false) {
            switch (phase) {
                case "bet":
                    return "Place bets";
                case "deal_initial_cards":
                    return "Dealing cards";
                case "players_turn":
                    return isMyTurn ? "Play your hand" : "Wait for your turn";
                case "dealers_turn":
                    return "Waiting for the dealer";
                case "payout":
                    return "Payout";
            };
        }

        socket.on("disconnected", disconnected);
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
        socket.on("dealer check blackjack", dealerCheckBlackjack);
        socket.on("restart", restart);
        socket.on("players turn", playersTurn);
        socket.on("player turn", playerTurn);
        socket.on("dealer plays", dealerPlays);
        socket.on("reveal dealer card", revealDealerCard);
        socket.on("user splitted", playerSplitted);
        socket.on("player result", playerResult);

        return () => {
            socket.off("disconnected", disconnected);
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
            socket.off("deal player card", dealPlayerCard);
            socket.off("deal dealer facedown card", dealDealerFacedownCard);
            socket.off("deal dealer card", dealDealerCard);
            socket.off("dealer check blackjack", dealerCheckBlackjack);
            socket.off("restart", restart);
            socket.off("players turn", playersTurn);
            socket.off("player turn", playerTurn);
            socket.off("dealer plays", dealerPlays);
            socket.off("reveal dealer card", revealDealerCard);
            socket.off("user splitted", playerSplitted);
            socket.off("player result", playerResult);
        }
    }, [isHandshakeComplete]);

    const cash = (worth ?? 0) - (totalBet ?? 0);

    let betChips = [0, 0, 0, 0, 0];
    if (totalBet) {
        betChips = convertToChips(totalBet);
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
            setTotalBet(prev => (prev ?? 0) + CHIPS[index]);
            socket.emit("change bet", index, "add");
        }
    }

    function removeBet(index: number) {
        if (totalBet && CHIPS[index] <= totalBet) {
            setTotalBet(prev => prev! - CHIPS[index]);
            socket.emit("change bet", index, "remove");
        }
    }

    const bustedOr21 = currentHand === 0
        ? handValue && (
            typeof handValue.value === "number"
                ? handValue.value >= 21
                : handValue.value.high >= 21
        )
        : hand2Value && (
            typeof hand2Value.value === "number"
                ? hand2Value.value >= 21
                : hand2Value.value.high >= 21
        );
    const canSplit = hand && hand.length === 2
        ? hand[0].value.some(v => hand[1].value.includes(v))
        && hand2.length === 0 // not splitted already
        && worth && bet && worth >= bet // sufficient balance
        && (currentHand === 0 && !stand
            || currentHand === 1 && !stand2)
        && !bustedOr21
        : false;
    const canHit = !(currentHand === 0 && stand) && !(currentHand === 1 && stand2) && !bustedOr21;
    const canStand = ((currentHand === 0 && !stand) || (currentHand === 1 && !stand2)) && !bustedOr21;
    const currentBet = currentHand === 0 ? bet : bet2;
    const canDouble = canStand
        && (currentHand === 0 ? hand.length === 2 : hand2.length === 2) // only on initial 2-card hand
        && currentBet && worth && worth >= currentBet; // sufficient cash to double the current hand's bet

    return (
        <div className="grid grid-rows-4 grid-cols-2 overflow-hidden bg-[url(/images/table.png)] bg-cover bg-center min-h-screen select-none">
            <Snowfall />
            <div id="dealer-zone" className="col-span-2">
                {getDealerComponent()}
            </div>

            <div id="player-zone" className="col-span-2 grid grid-cols-2 gap-2 px-8">
                <div className="flex flex-col items-center gap-2 justify-self-end">
                    <h2 className="flex text-white italic font-semibold">
                        You {worth ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{worth}</span> : <></>}
                    </h2>
                    {phase !== "bet" && <div>
                        <motion.div
                            className="relative h-24 w-32"
                            animate={isMyTurn && currentHand === 0 ? {
                                scale: [1, 1.03, 1]
                            } : {}}
                            transition={{
                                duration: 2,
                                repeat: isMyTurn && currentHand === 0 ? Number.POSITIVE_INFINITY : 0,
                                ease: "easeInOut"
                            }}
                        >
                            <AnimatePresence mode="popLayout">
                                {hand.map((card, index) =>
                                    <motion.div
                                        key={`hand-${card.rank}-${card.suit}-${index}`}
                                        className="absolute"
                                        style={{ left: `${index * 16}px` }}
                                        initial={{
                                            opacity: 0,
                                            y: -200,
                                            x: 100,
                                            scale: 0.8,
                                            rotate: -10
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            x: 0,
                                            scale: 1,
                                            rotate: 0
                                        }}
                                        exit={{
                                            opacity: 0,
                                            scale: 0.8
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 20,
                                            delay: index * 0.2
                                        }}
                                    >
                                        <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        <AnimatePresence mode="wait">
                            {handValue && handValue.value !== 0 && (
                                <motion.div
                                    key={typeof handValue.value === 'number' ? handValue.value : `${handValue.value.low}-${handValue.value.high}`}
                                    className="text-white italic font-semibold"
                                    initial={{ opacity: 0, scale: 0.5, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, y: 10 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    {typeof handValue.value === 'number'
                                        ? <>{handValue.value}</>
                                        : <>{handValue.value.low} / {handValue.value.high}</>
                                    } {handValue?.status && (
                                        <span className="text-[#DAA520] not-italic font-light">
                                            {handValue.status}
                                        </span>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {hand2 && hand2.length > 0 &&
                            <>
                                <motion.div
                                    className="relative h-24 w-32"
                                    animate={isMyTurn && currentHand === 1 ? {
                                        scale: [1, 1.03, 1]
                                    } : {}}
                                    transition={{
                                        duration: 2,
                                        repeat: isMyTurn && currentHand === 1 ? Number.POSITIVE_INFINITY : 0,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {hand2.map((card, index) =>
                                            <motion.div
                                                key={`hand2-${card.rank}-${card.suit}-${index}`}
                                                className="absolute"
                                                style={{ left: `${index * 16}px` }}
                                                initial={{
                                                    opacity: 0,
                                                    y: -200,
                                                    x: 100,
                                                    scale: 0.8,
                                                    rotate: -10
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                    x: 0,
                                                    scale: 1,
                                                    rotate: 0
                                                }}
                                                exit={{
                                                    opacity: 0,
                                                    scale: 0.8
                                                }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 200,
                                                    damping: 20,
                                                    delay: index * 0.2
                                                }}
                                            >
                                                <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                                <AnimatePresence mode="wait">
                                    {hand2Value && (
                                        <motion.div
                                            key={typeof hand2Value.value === 'number' ? hand2Value.value : `${hand2Value.value.low}-${hand2Value.value.high}`}
                                            className="text-white italic font-semibold"
                                            initial={{ opacity: 0, scale: 0.5, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, y: 10 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                            {typeof hand2Value.value === 'number'
                                                ? <>{hand2Value.value}</>
                                                : <>{hand2Value.value.low} / {hand2Value.value.high}</>
                                            } {hand2Value?.status && (
                                                <span className="text-[#DAA520] not-italic font-light">
                                                    {hand2Value.status}
                                                </span>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        }
                    </div>}
                    {phase === "bet" && <div className="flex gap-0.5">
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="white" amount={CHIPS[0]} size={30} />
                            <motion.button
                                onClick={() => addBet(0)}
                                className={`${CHIPS[0] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={CHIPS[0] <= cash ? { scale: 1.1 } : {}}
                                whileTap={CHIPS[0] <= cash ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                +
                            </motion.button>
                            <motion.button
                                onClick={() => removeBet(0)}
                                className={`${!totalBet || (totalBet < CHIPS[0]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={totalBet && totalBet >= CHIPS[0] ? { scale: 1.1 } : {}}
                                whileTap={totalBet && totalBet >= CHIPS[0] ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                -
                            </motion.button>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="red" amount={CHIPS[1]} size={30} />
                            <motion.button
                                onClick={() => addBet(1)}
                                className={`${CHIPS[1] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={CHIPS[1] <= cash ? { scale: 1.1 } : {}}
                                whileTap={CHIPS[1] <= cash ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                +
                            </motion.button>
                            <motion.button
                                onClick={() => removeBet(1)}
                                className={`${!totalBet || (totalBet < CHIPS[1]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={totalBet && totalBet >= CHIPS[1] ? { scale: 1.1 } : {}}
                                whileTap={totalBet && totalBet >= CHIPS[1] ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                -
                            </motion.button>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="green" amount={CHIPS[2]} size={30} />
                            <motion.button
                                onClick={() => addBet(2)}
                                className={`${CHIPS[2] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={CHIPS[2] <= cash ? { scale: 1.1 } : {}}
                                whileTap={CHIPS[2] <= cash ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                +
                            </motion.button>
                            <motion.button
                                onClick={() => removeBet(2)}
                                className={`${!totalBet || (totalBet < CHIPS[2]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={totalBet && totalBet >= CHIPS[2] ? { scale: 1.1 } : {}}
                                whileTap={totalBet && totalBet >= CHIPS[2] ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                -
                            </motion.button>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="black" amount={CHIPS[3]} size={30} />
                            <motion.button
                                onClick={() => addBet(3)}
                                className={`${CHIPS[3] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={CHIPS[3] <= cash ? { scale: 1.1 } : {}}
                                whileTap={CHIPS[3] <= cash ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                +
                            </motion.button>
                            <motion.button
                                onClick={() => removeBet(3)}
                                className={`${!totalBet || (totalBet < CHIPS[3]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={totalBet && totalBet >= CHIPS[3] ? { scale: 1.1 } : {}}
                                whileTap={totalBet && totalBet >= CHIPS[3] ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                -
                            </motion.button>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                            <Chip color="blue" amount={CHIPS[4]} size={30} />
                            <motion.button
                                onClick={() => addBet(4)}
                                className={`${CHIPS[4] > cash ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={CHIPS[4] <= cash ? { scale: 1.1 } : {}}
                                whileTap={CHIPS[4] <= cash ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                +
                            </motion.button>
                            <motion.button
                                onClick={() => removeBet(4)}
                                className={`${!totalBet || (totalBet < CHIPS[4]) ? "opacity-50" : ""} size-8 bg-[#DAA520] rounded-sm cursor-pointer text-[#016F32]`}
                                whileHover={totalBet && totalBet >= CHIPS[4] ? { scale: 1.1 } : {}}
                                whileTap={totalBet && totalBet >= CHIPS[4] ? { scale: 0.95 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                -
                            </motion.button>
                        </div>
                    </div>}
                </div>

                <div className="flex flex-col items-center gap-2 justify-self-start">
                    <div className="relative size-42">
                        <AnimatePresence>
                            {((phase === "bet" && totalTime && timeLeft && !check) || (phase === "players_turn" && isMyTurn && totalTime && timeLeft)) && (
                                <motion.svg
                                    className="absolute inset-0 -rotate-90"
                                    viewBox="0 0 144 144"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.3 }}
                                >
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
                                </motion.svg>
                            )}
                        </AnimatePresence>

                        <motion.div
                            className="grid grid-rows-3 bg-[#daa52080] rounded-full size-42 border-4 border-transparent"
                            animate={phase === "bet" ? {
                                scale: [1, 1.05, 1],
                                borderColor: ["transparent", "#DAA520", "transparent"]
                            } : {}}
                            transition={{
                                duration: 2,
                                repeat: phase === "bet" ? Number.POSITIVE_INFINITY : 0,
                                ease: "easeInOut"
                            }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={totalBet}
                                    className="flex justify-center items-end text-white italic font-semibold pb-1"
                                    initial={{ opacity: 0, y: -10, scale: 0.8 }}
                                    animate={{ opacity: totalBet ? 1 : 0, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25, duration: 0.2 }}
                                >
                                    {totalBet ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{totalBet}</span> : ''}
                                </motion.div>
                            </AnimatePresence>
                            <div className="flex justify-center items-center relative">
                                <AnimatePresence>
                                    {betChips[0] > 0 && (
                                        <motion.div
                                            key="white-chip"
                                            initial={{ scale: 0, y: -50, opacity: 0 }}
                                            animate={{ scale: 1, y: 0, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                            <Chip color="white" amount={betChips[0]} size={30} />
                                        </motion.div>
                                    )}
                                    {betChips[1] > 0 && (
                                        <motion.div
                                            key="red-chip"
                                            initial={{ scale: 0, y: -50, opacity: 0 }}
                                            animate={{ scale: 1, y: 0, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                                        >
                                            <Chip color="red" amount={betChips[1]} size={30} />
                                        </motion.div>
                                    )}
                                    {betChips[2] > 0 && (
                                        <motion.div
                                            key="green-chip"
                                            initial={{ scale: 0, y: -50, opacity: 0 }}
                                            animate={{ scale: 1, y: 0, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                                        >
                                            <Chip color="green" amount={betChips[2]} size={30} />
                                        </motion.div>
                                    )}
                                    {betChips[3] > 0 && (
                                        <motion.div
                                            key="black-chip"
                                            initial={{ scale: 0, y: -50, opacity: 0 }}
                                            animate={{ scale: 1, y: 0, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                                        >
                                            <Chip color="black" amount={betChips[3]} size={30} />
                                        </motion.div>
                                    )}
                                    {betChips[4] > 0 && (
                                        <motion.div
                                            key="blue-chip"
                                            initial={{ scale: 0, y: -50, opacity: 0 }}
                                            animate={{ scale: 1, y: 0, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                                        >
                                            <Chip color="blue" amount={betChips[4]} size={30} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                    <div className="flex gap-2 justify-between">
                        {phase === "players_turn" && isMyTurn &&
                            <div className="grid grid-cols-2 gap-2">
                                <motion.button
                                    onClick={() => {
                                        if (canHit) {
                                            socket.emit("hit");
                                        }
                                    }}
                                    className={`${!canHit ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                    title="Hit - Draw another card"
                                    whileHover={!stand && !bustedOr21 ? { scale: 1.05, backgroundColor: "#c99a1f" } : {}}
                                    whileTap={!stand && !bustedOr21 ? { scale: 0.95 } : {}}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    <Plus size={25} />
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        if (canStand) {
                                            if (currentHand === 0) {
                                                setStand(true);
                                            }
                                            else {
                                                setStand2(true);
                                            }
                                            socket.emit("stand");
                                        }
                                    }}
                                    className={`${!canStand ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                    title="Stand - Keep current hand"
                                    whileHover={!stand && !bustedOr21 ? { scale: 1.05, backgroundColor: "#c99a1f" } : {}}
                                    whileTap={!stand && !bustedOr21 ? { scale: 0.95 } : {}}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    <Hand size={25} />
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        if (canSplit) {
                                            socket.emit("split");
                                        }
                                    }}
                                    className={`${!canSplit ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                    title="Split — Split into two hands"
                                    whileHover={!stand ? { scale: 1.05, backgroundColor: "#c99a1f" } : {}}
                                    whileTap={!stand ? { scale: 0.95 } : {}}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    <Split size={25} />
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        if (canDouble) {
                                            socket.emit("double");
                                        }
                                    }}
                                    className={`${!canDouble ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                    title="Double — Double bet, take one card"
                                    whileHover={!stand ? { scale: 1.05, backgroundColor: "#c99a1f" } : {}}
                                    whileTap={!stand ? { scale: 0.95 } : {}}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    2X
                                </motion.button>
                            </div>
                        }
                        {phase === "bet" &&
                            <div className="grid grid-cols-2 gap-2">
                                <motion.button
                                    onClick={() => {
                                        if (totalBet && totalBet > 0 && !check) {
                                            setCheck(true);
                                            socket.emit("check");
                                        }
                                    }}
                                    className={`${!totalBet || totalBet === 0 || check ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                    title="Ready — End turn now"
                                    whileHover={totalBet && totalBet > 0 && !check ? { scale: 1.05, backgroundColor: "#c99a1f" } : {}}
                                    whileTap={totalBet && totalBet > 0 && !check ? { scale: 0.95 } : {}}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    <Check size={25} />
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        if (totalBet && totalBet > 0 && !check) {
                                            setTotalBet(0);
                                            socket.emit("remove bet");
                                        }
                                    }}
                                    className={`${!totalBet || totalBet === 0 || check ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                    title="Clear Bet — Remove your bet"
                                    whileHover={totalBet && totalBet > 0 && !check ? { scale: 1.05, backgroundColor: "#c99a1f" } : {}}
                                    whileTap={totalBet && totalBet > 0 && !check ? { scale: 0.95 } : {}}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    <X size={25} />
                                </motion.button>
                                {worth && betBefore && worth >= betBefore ?
                                    <motion.button
                                        onClick={() => {
                                            if (worth && betBefore && worth >= betBefore && !check) {
                                                setTotalBet(betBefore);
                                                socket.emit("repeat bet");
                                            }
                                        }}
                                        className={`${check ? "opacity-50" : ""} px-2 py-1 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                        title="Rebet — Repeat last bet"
                                        whileHover={!check ? { scale: 1.05, backgroundColor: "#c99a1f" } : {}}
                                        whileTap={!check ? { scale: 0.95 } : {}}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    >
                                        <Repeat size={25} />
                                    </motion.button> : <></>
                                }
                                {worth && betBefore && worth >= betBefore * 2 ?
                                    <motion.button
                                        onClick={() => {
                                            if (worth && betBefore && worth >= betBefore * 2 && !check) {
                                                setTotalBet(betBefore * 2);
                                                socket.emit("double bet");
                                            }
                                        }}
                                        className={`${check ? "opacity-50" : ""} px-2 bg-[#DAA520] rounded-sm font-semibold cursor-pointer text-[#016F32]`}
                                        title="Double Bet — Double your bet"
                                        whileHover={!check ? { scale: 1.05, backgroundColor: "#c99a1f" } : {}}
                                        whileTap={!check ? { scale: 0.95 } : {}}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    >
                                        2X
                                    </motion.button> : <></>
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>

            <div id="other-players" className="col-span-2 grid grid-cols-2 gap-2 px-8">
                <div className="justify-self-end">
                    <AnimatePresence mode="wait">
                        {getOtherPlayerComponent(0)}
                    </AnimatePresence>
                </div>

                <div className="justify-self-start">
                    <AnimatePresence mode="wait">
                        {getOtherPlayerComponent(1)}
                    </AnimatePresence>
                </div>
            </div>

            <div id="chat" className="col-span-2">

            </div>

            <AnimatePresence>
                {!isConnected && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-center font-semibold z-50"
                    >
                        Disconnected. <button onClick={() => window.location.reload()} className="underline hover:text-gray-200">Refresh the page</button> to reconnect.
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    function getDealerComponent() {
        return <div className="flex flex-col items-center">
            <div className="flex w-full justify-center">
                <div className="w-1/5 flex justify-center">
                    <motion.button
                        onClick={toggleMute}
                        className="text-[#DAA520] cursor-pointer flex flex-col items-center gap-1"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        title={isMuted ? "Unmute Christmas Radio" : "Mute Christmas Radio"}
                    >
                        <div className="flex items-center gap-1">
                            <Music className={isMuted ? "opacity-50" : ""} />
                            {isMuted ? <VolumeX size={16} className="opacity-50" /> : <Volume2 size={16} />}
                        </div>
                        <div className={`text-xs ${isMuted ? "opacity-50" : ""}`}>
                            {isMuted ? "Muted" : "Radio"}
                        </div>
                    </motion.button>
                </div>

                <div className="flex flex-col items-center min-h-[150px]">
                    <motion.div
                        className="flex flex-col items-center justify-center size-48 -mt-24 bg-[#daa52080] rounded-full"
                        animate={phase === "dealers_turn" ? {
                            scale: [1, 1.03, 1],
                            boxShadow: [
                                "0 0 0px rgba(218, 165, 32, 0)",
                                "0 0 20px rgba(218, 165, 32, 0.5)",
                                "0 0 0px rgba(218, 165, 32, 0)"
                            ]
                        } : {}}
                        transition={{
                            duration: 2,
                            repeat: phase === "dealers_turn" ? Number.POSITIVE_INFINITY : 0,
                            ease: "easeInOut"
                        }}
                    >
                        <div className="mt-24 text-white font-semibold italic">
                            Dealer
                        </div>
                        <div className="relative h-24 w-32 mt-6" style={{ perspective: '1000px' }}>
                            {dealerHand.map((card, index) => {
                                const isFaceDown = card.rank === "facedown";
                                const isFirstCard = index === 0;

                                // Calculate position offset when revealing
                                const baseLeft = index * 16;
                                const spreadOffset = isDealerRevealingCard && !isFirstCard ? 30 : 0;
                                const leftPosition = baseLeft + spreadOffset;

                                // Animation for checking the facedown card
                                const checkingAnimation = isFaceDown && isDealerCheckingCard ? {
                                    rotateX: [0, -15, -15, 0],
                                    y: [0, -10, -10, 0],
                                    scale: [1, 1.05, 1.05, 1]
                                } : {};

                                return (
                                    <motion.div
                                        key={`dealer-position-${index}`}
                                        className="absolute"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            zIndex: isFirstCard && (isDealerRevealingCard || isDealerCheckingCard) ? 10 : index
                                        }}
                                        initial={{
                                            opacity: 0,
                                            y: -100,
                                            scale: 0.8,
                                            rotate: 10,
                                            left: `${baseLeft}px`
                                        }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            scale: 1,
                                            rotate: 0,
                                            left: `${leftPosition}px`,
                                            ...checkingAnimation
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 20,
                                            delay: index * 0.2,
                                            left: {
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 25
                                            },
                                            rotateX: isDealerCheckingCard ? {
                                                duration: 2,
                                                times: [0, 0.3, 0.7, 1],
                                                ease: "easeInOut"
                                            } : {},
                                            y: isDealerCheckingCard ? {
                                                duration: 2,
                                                times: [0, 0.3, 0.7, 1],
                                                ease: "easeInOut"
                                            } : {},
                                            scale: isDealerCheckingCard ? {
                                                duration: 2,
                                                times: [0, 0.3, 0.7, 1],
                                                ease: "easeInOut"
                                            } : {}
                                        }}
                                    >
                                        <AnimatePresence mode="wait" initial={false}>
                                            <motion.div
                                                key={`card-${card.rank}-${card.suit}`}
                                                style={{
                                                    position: 'absolute',
                                                    transformStyle: 'preserve-3d',
                                                    width: '65px',
                                                    height: '94px'
                                                }}
                                                initial={isFirstCard && !isFaceDown ? { rotateY: 0 } : false}
                                                animate={{ rotateY: 180 }}
                                                exit={{ rotateY: 0 }}
                                                transition={{
                                                    duration: 0.6,
                                                    ease: "easeInOut"
                                                }}
                                            >
                                                <Image
                                                    src={card.imageUrl}
                                                    alt={card.alt}
                                                    width={65}
                                                    height={94}
                                                    draggable={false}
                                                    style={{
                                                        backfaceVisibility: 'hidden',
                                                        transform: 'rotateY(180deg)'
                                                    }}
                                                />
                                            </motion.div>
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                    <AnimatePresence mode="wait">
                        {dealerHandValue && dealerHandValue.value !== 0 && (
                            <motion.div
                                key={typeof dealerHandValue.value === 'number' ? dealerHandValue.value : `${dealerHandValue.value.low}-${dealerHandValue.value.high}`}
                                className="mt-12 text-white italic font-semibold"
                                initial={{ opacity: 0, scale: 0.5, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 10 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                {typeof dealerHandValue.value === 'number'
                                    ? <>{dealerHandValue.value}</>
                                    : <>{dealerHandValue.value.low} / {dealerHandValue.value.high}</>
                                } {dealerHandValue?.status && (
                                    <span className="text-[#DAA520] not-italic font-light">
                                        {dealerHandValue.status}
                                    </span>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="w-1/5 text-[#DAA520] text-center cursor-pointer">
                    <div className="font-extrabold">
                        X
                    </div>
                    <div>
                        Quit
                    </div>
                </div>
            </div>
            <AnimatePresence mode="wait">
                <motion.div
                    className="mt-4 italic font-semibold"
                    key={handResult?.result || status}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                >
                    {handResult?.result ? (
                        hand2Result ? (
                            (() => {
                                const hand1IsWin = handResult.result === "win" || handResult.result === "blackjack";
                                const hand2IsWin = hand2Result.result === "win" || hand2Result.result === "blackjack";
                                const hand1IsLose = handResult.result === "lose";
                                const hand2IsLose = hand2Result.result === "lose";
                                const hand1IsPush = handResult.result === "push";
                                const hand2IsPush = hand2Result.result === "push";

                                if (hand1IsWin && hand2IsWin) {
                                    return (
                                        <span className="inline-flex items-center gap-1 text-green-400">
                                            You won <Currency size={20} />{totalWinnings}!
                                        </span>
                                    );
                                }
                                if (hand1IsLose && hand2IsLose) {
                                    return <span className="text-red-400">You lost</span>;
                                }
                                if (hand1IsPush && hand2IsPush) {
                                    return <span className="text-yellow-400">Push</span>;
                                }

                                const getHandText = (result: HandResult, handName: string) => {
                                    const isWin = result.result === "win" || result.result === "blackjack";
                                    const isLose = result.result === "lose";

                                    if (isWin) {
                                        return (
                                            <span className="inline-flex text-green-400">
                                                {handName}: Won <Currency size={20} className="ml-2" />{result.winnings}
                                            </span>
                                        );
                                    }
                                    if (isLose) {
                                        return <span className="text-red-400">{handName}: You lost</span>;
                                    }
                                    return <span className="text-yellow-400">{handName}: Push</span>;
                                };

                                return (
                                    <span className="inline-flex items-center gap-2">
                                        {getHandText(handResult, "Hand 1")}
                                        <span className="text-white">|</span>
                                        {getHandText(hand2Result, "Hand 2")}
                                    </span>
                                );
                            })()
                        ) : (
                            // Single hand scenario
                            <span className={`inline-flex items-center gap-1 ${handResult?.result === "win" || handResult?.result === "blackjack"
                                ? "text-green-400"
                                : handResult?.result === "lose"
                                    ? "text-red-400"
                                    : "text-yellow-400"
                                }`}>
                                {handResult?.result === "win" && (
                                    <>You won <Currency size={20} />{totalWinnings}!</>
                                )}
                                {handResult?.result === "blackjack" && (
                                    <>You won <Currency size={20} />{totalWinnings}!</>
                                )}
                                {handResult?.result === "lose" && "You lost"}
                                {handResult?.result === "push" && "Push"}
                            </span>
                        )
                    ) : (
                        <span className="text-white">{status}</span>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    }

    function getOtherPlayerComponent(playerIndex: number) {
        if (otherPlayers.length > playerIndex) {
            const otherPlayer = otherPlayers[playerIndex];
            const isPlayersTurn = currentPlayerNickname === otherPlayer.nickname;

            return <motion.div
                key={otherPlayer.nickname}
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={isPlayersTurn ? {
                    opacity: otherPlayer.disconnected ? 0.5 : 1,
                    scale: [1, 1.02, 1],
                    y: 0
                } : {
                    opacity: otherPlayer.disconnected ? 0.5 : 1,
                    scale: 1,
                    y: 0
                }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{
                    opacity: { duration: 0.3 },
                    scale: isPlayersTurn ? {
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut"
                    } : { type: "spring", stiffness: 300, damping: 25 },
                    y: { type: "spring", stiffness: 300, damping: 25 }
                }}
            >
                <h2 className="flex text-white italic font-semibold">
                    {otherPlayer.nickname} {otherPlayer.worth ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{otherPlayer.worth}</span> : ''}
                </h2>
                {phase !== "bet" &&
                    <div className="flex flex-col items-start">
                        <div className="flex text-white italic">
                            {otherPlayer.totalBet ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{otherPlayer.totalBet}</span> : ''}
                        </div>
                        <div className="relative">
                            <AnimatePresence>
                                {isPlayersTurn && phase === "players_turn" && totalTime && timeLeft && (
                                    <motion.svg
                                        className="absolute -left-8 -top-8"
                                        width="192"
                                        height="192"
                                        viewBox="0 0 192 192"
                                        style={{ transform: 'rotate(-90deg)' }}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <circle
                                            cx="96"
                                            cy="96"
                                            r="90"
                                            fill="none"
                                            stroke="#DAA520"
                                            strokeWidth="4"
                                            strokeDasharray={`${2 * Math.PI * 90}`}
                                            strokeDashoffset={`${2 * Math.PI * 90 * (timeLeft / totalTime)}`}
                                            className="transition-all duration-1000 ease-linear"
                                        />
                                    </motion.svg>
                                )}
                            </AnimatePresence>
                            <motion.div
                                className="relative h-24 w-32"
                                animate={isPlayersTurn && otherPlayer.currentHand === 0 ? {
                                    scale: [1, 1.03, 1]
                                } : {}}
                                transition={{
                                    duration: 2,
                                    repeat: isPlayersTurn && otherPlayer.currentHand === 0 ? Number.POSITIVE_INFINITY : 0,
                                    ease: "easeInOut"
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {otherPlayer.hand && otherPlayer.hand.map((card, index) =>
                                        <motion.div
                                            key={`other-player-hand-${playerIndex}-${card.rank}-${card.suit}-${index}`}
                                            className="absolute"
                                            style={{ left: `${index * 16}px` }}
                                            initial={{
                                                opacity: 0,
                                                y: -150,
                                                x: playerIndex === 0 ? 80 : -80,
                                                scale: 0.8,
                                                rotate: playerIndex === 0 ? -8 : 8
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                x: 0,
                                                scale: 1,
                                                rotate: 0
                                            }}
                                            exit={{
                                                opacity: 0,
                                                scale: 0.8
                                            }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 20,
                                                delay: index * 0.2
                                            }}
                                        >
                                            <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                            <AnimatePresence mode="wait">
                                {otherPlayer.handValue && otherPlayer.handValue.value !== 0 && (
                                    <motion.div
                                        key={typeof otherPlayer.handValue.value === 'number' ? otherPlayer.handValue.value : `${otherPlayer.handValue.value.low}-${otherPlayer.handValue.value.high}`}
                                        className="text-white italic font-semibold"
                                        initial={{ opacity: 0, scale: 0.5, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, y: 10 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        {typeof otherPlayer.handValue.value === 'number'
                                            ? <>{otherPlayer.handValue ? otherPlayer.handValue.value : <></>}</>
                                            : <>{otherPlayer.handValue.value.low} / {otherPlayer.handValue.value.high}</>
                                        } {otherPlayer.handValue?.status && (
                                            <span className="text-[#DAA520] not-italic font-light">
                                                {otherPlayer.handValue.status}
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <motion.div
                                className="relative h-24 w-32"
                                animate={isPlayersTurn && otherPlayer.currentHand === 1 ? {
                                    scale: [1, 1.03, 1]
                                } : {}}
                                transition={{
                                    duration: 2,
                                    repeat: isPlayersTurn && otherPlayer.currentHand === 1 ? Number.POSITIVE_INFINITY : 0,
                                    ease: "easeInOut"
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {otherPlayer.hand2 && otherPlayer.hand2.map((card, index) =>
                                        <motion.div
                                            key={`other-player-hand2-${playerIndex}-${card.rank}-${card.suit}-${index}`}
                                            className="absolute"
                                            style={{ left: `${index * 16}px` }}
                                            initial={{
                                                opacity: 0,
                                                y: -150,
                                                x: playerIndex === 0 ? 80 : -80,
                                                scale: 0.8,
                                                rotate: playerIndex === 0 ? -8 : 8
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                x: 0,
                                                scale: 1,
                                                rotate: 0
                                            }}
                                            exit={{
                                                opacity: 0,
                                                scale: 0.8
                                            }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 20,
                                                delay: index * 0.2
                                            }}
                                        >
                                            <Image src={card.imageUrl} alt={card.alt} width={65} height={94} draggable={false} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                            <AnimatePresence mode="wait">
                                {otherPlayer.hand2Value && (
                                    <motion.div
                                        key={typeof otherPlayer.hand2Value.value === 'number' ? otherPlayer.hand2Value.value : `${otherPlayer.hand2Value.value.low}-${otherPlayer.hand2Value.value.high}`}
                                        className="text-white italic font-semibold"
                                        initial={{ opacity: 0, scale: 0.5, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, y: 10 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        {typeof otherPlayer.hand2Value.value === 'number'
                                            ? <>{otherPlayer.hand2Value ? otherPlayer.hand2Value.value : <></>}</>
                                            : <>{otherPlayer.hand2Value.value.low} / {otherPlayer.hand2Value.value.high}</>
                                        } {otherPlayer.hand2Value?.status && (
                                            <span className="text-[#DAA520] not-italic font-light">
                                                {otherPlayer.hand2Value.status}
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                }
                {phase === "bet" ?
                    <div className="relative size-42">
                        <AnimatePresence>
                            {(phase === "bet" && totalTime && timeLeft && !otherPlayer.check) && (
                                <motion.svg
                                    className="absolute inset-0 -rotate-90"
                                    viewBox="0 0 144 144"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.3 }}
                                >
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
                                </motion.svg>
                            )}
                        </AnimatePresence>
                        <div className="grid grid-rows-3 bg-[#daa52039] rounded-full size-42">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={otherPlayer.totalBet}
                                    className="flex justify-center items-end text-white italic font-semibold pb-1"
                                    initial={{ opacity: 0, y: -10, scale: 0.8 }}
                                    animate={{ opacity: otherPlayer.totalBet ? 1 : 0, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25, duration: 0.2 }}
                                >
                                    {otherPlayer.totalBet ? <span className="inline-flex items-center"><Currency size={16} className="ml-2" />{otherPlayer.totalBet}</span> : ''}
                                </motion.div>
                            </AnimatePresence>
                            <div className="flex justify-center items-center h-full">
                                {(() => {
                                    const playerBetChips = otherPlayer.totalBet
                                        ? convertToChips(otherPlayer.totalBet)
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
                    </div>
                    : <></>}
            </motion.div>;
        }

        return <></>;
    }
}