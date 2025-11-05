import { Card } from "../util";
import { Room } from "./room";

export interface UserData {
    socketId: string;
    nickname: string;
    countryCode: string;
    room?: Room;
    roomName?: string;
    cash?: number;
    bet?: number;
    betBefore?: number;
    check?: boolean;
    stand?: boolean;
    hand?: Card[];
    disconnected: boolean;
    disconnectedTimer?: NodeJS.Timeout;
}