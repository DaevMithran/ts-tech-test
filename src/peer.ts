import { randomUUID } from "crypto";
import * as net from "net";
import { Amount, MessageId, MessagePayload, MessageType, PayAckMessage, PayMessage, PayRejectMessage, PeerError, PeerEvent } from "./types.js";
import { EventEmitter } from "events";

export class Peer extends EventEmitter<PeerEvent> {
    private balance: number = 0
    private socketData = ""
    private server: net.Server | null = null
    private socket: net.Socket | null = null
    private pendingPayments= new Map<MessageId, Amount>()  

    constructor(port: number) {
        super()
        this.initialize(port)
    }

    initialize(port: number) {
        this.server = net.createServer((s)=> {
            this.socket = s
            this.onPeerConnected(this.socket)
        })

        this.server.listen(port);

        this.server.on("error", (err: Error) => {
            console.error(`Server error: ${err.message}`);
            process.exit(1);
        });
    }

    connect(port: number, host: string = "127.0.0.1"): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection( port, host , () => {
            this.onPeerConnected(this.socket!);
                resolve();
            });

            this.socket.once("error", (err) => {
                reject(err);
            });
        });
    }

    transfer(amount: number): string | undefined{
        if (!this.getIsConnected()) {
            this.emit("error", PeerError.NoConnection)
            return
        }

        if (amount <= 0) {
            this.emit("error", PeerError.TransferInvalidAmount)
            return
        }

        const message: PayMessage = {
            id: randomUUID(),
            type: MessageType.Pay,
            amount: amount.toString(),
        }
        this.pendingPayments.set(message.id, amount)
        this.sendMessage(message)

        return message.id
    }

    getBalance(): number {
        return this.balance
    }
    
    cleanup() {
        this.emit('disconnected')
        if (this.socket && !this.socket.destroyed) {
            this.socket.destroy()
            this.socket = null
        }

        if(this.server) {
            this.server.close()
            this.server = null
        }
    }

    getIsConnected(): boolean {
        return !!this.socket && !this.socket.destroyed
    }

    private setBalance(balance: number) {
        this.balance = balance
    }

    private sendMessage(message: MessagePayload) {
        this.socket?.write(JSON.stringify(message) + "\n", (err)=> {
            if(err) {
                console.error(err?.message)
            }
        })
    }

    private handleMessage(message: MessagePayload) {
        switch(message.type) {
            case MessageType.Pay:
                const currentBalance = this.getBalance()
                const amount =  parseInt(message.amount)
                // Edge case if one peer is malicious
                if (isNaN(amount) || amount <= 0) {
                    this.sendMessage({
                        type: MessageType.PayReject,
                        id: message.id,
                        reason: PeerError.HandleInvalidAmount
                    } satisfies PayRejectMessage);
                    this.emit("error", PeerError.HandleInvalidAmount)
                    return;
                }
                this.setBalance(currentBalance + amount)
                this.sendMessage({
                    type: MessageType.PayAck,
                    id: message.id
                } satisfies PayAckMessage)
                this.emit('paid', amount)
                break
            case MessageType.PayAck: {
                const amount = this.pendingPayments.get(message.id)
                if(amount) {
                    this.setBalance(this.balance -= amount)
                    this.pendingPayments.delete(message.id)
                    this.emit("ack", message.id)
                }
                break
            }
            case MessageType.PayReject: {
                const amount = this.pendingPayments.get(message.id)
                if(amount) {
                    this.pendingPayments.delete(message.id)
                    this.emit("error", PeerError.PaymentRejected)
                }
                break
            }
        }

        return
    }

    private onPeerConnected(socket: net.Socket) {
        this.emit('connected')
        socket.on("data", (data: Buffer) => {
                this.socketData += data.toString()
                const lines = this.socketData.toString().split("\n");
                this.socketData = lines.pop()!; // remove empty string
                for (const line of lines) {
                    try {
                        const msg: MessagePayload = JSON.parse(line);
                        this.handleMessage(msg);
                    } catch {
                        // ignore malformed messages
                    }
                }
            });

        socket.on("close", () => {
            // console.debug("\nConnection lost. Goodbye.")
            this.cleanup()
        });

        socket.on("error", (err: Error) => {
            this.emit("error", `Peer: Socket: ${err.message}`)
            this.cleanup();
        });        
    }
}