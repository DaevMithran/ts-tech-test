import { describe, it, expect, afterEach } from "@jest/globals"
import { Peer } from "../src/peer.js"
import { once } from "events"

const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Event timed out`)), 1000)
)

describe("Peer test module", ()=>{
   let port = 5000

    afterEach(()=>{
       port += 1
    })

    it("Should initialize and cleanup peer", () => {
        const peer = new Peer(0)

        expect(peer.getBalance()).toBe(0)
        expect(peer.getIsConnected()).toBeFalsy()

        peer.cleanup()
    })

    it("Should create connection and get disconnected on cleanup", async () => {
        const alice = new Peer(0)
        const bob = new Peer(10000)

        const connectedEvents = [once(alice, "connected"), once(bob, "connected")]
        alice.connect(10000)
        await Promise.race([Promise.all(connectedEvents), timeout])

        expect(alice.getIsConnected()).toBe(true)
        expect(bob.getIsConnected()).toBe(true)

        const disconnectedEvents = [once(alice, "disconnected"), once(bob, "disconnected")]
        alice.cleanup()
        await Promise.race([Promise.all(disconnectedEvents), timeout])

        expect(alice.getIsConnected()).toBe(false)
        expect(bob.getIsConnected()).toBe(false)
    })

    it("Should transfer and update balance", async () => {
        const alice = new Peer(0)
        const bob = new Peer(3000)

        const connectedEvents = [once(alice, "connected"), once(bob, "connected")]
        alice.connect(3000)
        await Promise.race([Promise.all(connectedEvents), timeout])

        const paidEvent = [once(bob, "paid"), once(alice, "ack")]
        alice.transfer(10)
        await Promise.race([Promise.all(paidEvent), timeout])

        expect(alice.getBalance()).toBe(-10)
        expect(bob.getBalance()).toBe(10)

        const disconnectedEvents = [once(alice, "disconnected"), once(bob, "disconnected")]
        alice.cleanup()
        await Promise.race([Promise.all(disconnectedEvents), timeout])
    })

    it("Should validate negative amount", async () => {
        const alice = new Peer(0)
        const bob = new Peer(4000)

        const connectedEvents = [once(alice, "connected"), once(bob, "connected")]
        alice.connect(4000)
        await Promise.race([Promise.all(connectedEvents), timeout])

        const errorEvent = once(alice, "error")
        alice.transfer(-10)
        await Promise.race([errorEvent, timeout])
        expect(alice.getBalance()).toBe(0)
        expect(bob.getBalance()).toBe(0)

        const disconnectedEvents = [once(alice, "disconnected"), once(bob, "disconnected")]
        alice.cleanup()
        await Promise.race([Promise.all(disconnectedEvents), timeout])
    })

    it("Should handle bidirectional payments", async () => {
        const alice = new Peer(0)
        const bob = new Peer(3001)

        const connectedEvents = [once(alice, "connected"), once(bob, "connected")]
        alice.connect(3001)
        await Promise.race([Promise.all(connectedEvents), timeout])

        const paidEvent = [once(bob, "paid"), once(alice, "ack"), once(alice, "paid"), once(bob, "ack")]
        alice.transfer(10)
        bob.transfer(10)
        await Promise.race([Promise.all(paidEvent), timeout])

        expect(alice.getBalance()).toBe(0)
        expect(bob.getBalance()).toBe(0)

        const disconnectedEvents = [once(alice, "disconnected"), once(bob, "disconnected")]
        alice.cleanup()
        await Promise.race([Promise.all(disconnectedEvents), timeout])
    })
})