import { UserData } from "./user-data";

export interface Room {
    name: string;
    players: UserData[];
    timer?: NodeJS.Timeout;
    timeLeft?: number;
    phase?: "bet" | "";
}