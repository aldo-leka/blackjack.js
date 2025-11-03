import { Card } from "../util";
import { Room } from "./room";

export interface UserData {
    nickname: string;
    socketId: string;
    countryCode: string;
    room?: Room;
    roomName?: string;
    cash?: number;
    bet?: number;
    check?: boolean;
    hand?: Card[];
}