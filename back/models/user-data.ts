import { Card, HandResult } from "../util";
import { Room } from "./room";

export interface UserData {
    socketId: string;
    nickname: string;
    countryCode: string;
    room?: Room;
    roomName?: string;
    cash?: number;
    bet?: number;
    bet2?: number;
    totalBet?: number;
    betBefore?: number;
    check?: boolean;
    stand?: boolean;
    stand2?: boolean;
    hand?: Card[];
    hand2?: Card[];
    currentHand?: number;
    winningsThisRound?: number;
    handResult?: HandResult;
    hand2Result?: HandResult;
    disconnected: boolean;
    disconnectedTimer?: NodeJS.Timeout;
}