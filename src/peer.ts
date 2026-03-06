import { randomUUID } from "crypto";
import * as net from "net";
import { AckMessage, Amount, MessageId, MessagePayload, MessageType, PeerEvent } from "./types.js";
import { EventEmitter } from "events";

export class Peer extends EventEmitter<PeerEvent> {
    private balance: number = 0
    private socketData = ""
    private socket: net.Socket | null = null
    private pendingPayments= new Map<MessageId, Amount>()  

    constructor(port: number) {
        super()
        this.initialize(port)
    }

    initialize(port: number) {
        const s = net.createServer((s)=> {
            this.socket = s
            this.onPeerConnected(this.socket)
        })

        s.listen(port, () => {
            console.log(`Listening on port ${port}... waiting for peer to connect.`);
        });

        s.on("error", (err: Error) => {
            console.error(`Server error: ${err.message}`);
            process.exit(1);
        });
    }

    connect(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection({ port }, () => {
            this.onPeerConnected(this.socket!);
                resolve();
            });

            this.socket.once("error", (err) => {
                reject(err);
            });
        });
    }

    transfer(amount: number) {
        const message = {
            id: randomUUID(),
            type: MessageType.Pay,
            amount: amount.toString(),
        }
        this.pendingPayments.set(message.id, amount)
        this.sendMessage(message)    
    }

    getBalance(): number {
        return this.balance
    }

    private setBalance(balance: number) {
        this.balance = balance
    }

    private sendMessage(message: MessagePayload) {
        this.socket?.write(JSON.stringify(message) + "\n", (err)=> {
            if(err) {
                console.log(err?.message)
            }
        })
    }

    private handleMessage(message: MessagePayload) {
        switch(message.type) {
            case MessageType.Pay:
                const currentBalance = this.getBalance()
                const amount =  parseInt(message.amount)
                this.setBalance(currentBalance + amount)
                this.sendMessage({
                    type: MessageType.PayAck,
                    id: message.id
                } satisfies AckMessage)
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
        }

        return
    }

    cleanup() {
        this.emit('disconnected')
        if (this.socket && !this.socket.destroyed) {
            this.socket.destroy()
            this.socket = null
        }
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
            console.log("\nConnection lost. Goodbye.")
            this.cleanup()
            process.exit(0)
        });

        socket.on("error", (err: Error) => {
            this.cleanup();
            process.exit(1);
        });        
    }
}