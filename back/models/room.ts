import { Card } from "../util";
import { UserData } from "./user-data";

export interface Room {
    name: string;
    players: UserData[];
    timer?: NodeJS.Timeout;
    timeLeft?: number;
    phase?: "bet" | "deal_initial_cards" | "players_play" | "dealer_plays" | "payout";
    shoe?: Card[];
    dealerHand?: Card[];
    currentPlayerIndex?: number;
}