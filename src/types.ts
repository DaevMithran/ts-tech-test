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
    PayReject = "PAY_REJECT"
}

export type MessagePayload = PayMessage | PayAckMessage | PayRejectMessage
export type MessageId = string
export type Amount = number

export type PayMessage = {
    type: MessageType.Pay,
    id: MessageId
    amount: string,
}

export type PayAckMessage = {
    type: MessageType.PayAck,
    id: MessageId
}

export type PayRejectMessage = {
    type: MessageType.PayReject,
    id: MessageId
    reason: string
}

export interface PeerEvent extends EventEmitterEventMap {
    connected: []
    disconnected: []
    paid: [amount: number]
    ack: [id: string]
    error: [reason: string]
}

export enum PeerError {
    TransferInvalidAmount = "Peer: Transfer: Transfer amount must be positive.",
    HandleInvalidAmount = "Peer: Handle: Invalid Amount Received",
    NoConnection = "Peer: Connection: No active peer connection.",
    PaymentRejected = "Peer: Handle: Payment Rejected",
}