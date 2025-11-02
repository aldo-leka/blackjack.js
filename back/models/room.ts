import { UserData } from "./user-data";

export interface Room {
    name: string;
    players: UserData[];
    timer?: NodeJS.Timeout;
    timeLeft?: number;
    phase?: "bet" | "deal_initial_cards" | "players_play" | "dealer_play" | "payout";
}