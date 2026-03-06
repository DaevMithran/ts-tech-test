import { EventEmitterEventMap } from "events"

export enum CommandType {
    Connect = "connect",
    Pay     = "pay",
    Balance = "balance",
    Exit    = "exit"
}

export enum MessageType {
    Pay    = "PAY",
    PayAck = "PAY_ACK",
}

export type MessagePayload = PayMessage | AckMessage
export type MessageId = string
export type Amount = number

export type PayMessage = {
    type: MessageType.Pay,
    id: MessageId
    amount: string,
}

export type AckMessage = {
    type: MessageType.PayAck,
    id: MessageId
}

export interface PeerEvent extends EventEmitterEventMap {
    connected: [],
    paid: [amount: number],
    ack: [id: string]
}