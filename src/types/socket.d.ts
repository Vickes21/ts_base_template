import { IUser } from "src/types/user";

export interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
  token: (f: {
    message_id: string;
    content: string;
  }) => void;
  newMessage: (g: {
    id: string;
  }) => void;
  endMessage: (h: {
    id: string;
  }) => void;
}

export interface ClientToServerEvents {
  hello: () => void;
  message: (data: {
    message: string,
    chatId: number,
    user: IUser
  }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  name: string;
  age: number;
}