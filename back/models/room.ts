import { Card } from "../util";
import { UserData } from "./user-data";

type Phase = "bet" | "deal_initial_cards" | "players_turn" | "dealers_turn" | "payout";

export interface Room {
    name: string;
    players: UserData[];
    timer?: NodeJS.Timeout;
    timeLeft?: number;
    phase?: Phase;
    shoe?: Card[];
    dealerHand?: Card[];
    currentPlayerIndex?: number;
    cardsDealt?: number;
    needsReshuffle?: boolean;
}