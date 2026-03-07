# P2P relationships

The solution creates a P2P channel using TCP sockets, each peer can act both as a listener and connecter. Once a connection is established, peers can use the pay function to transfer amounts bidirectionally.


## Approach

The payment flow follows a simple request acknowledge protocol

Every payment is stored in an array mapped to an unique id as pending.
Pending payments are resolved or rejected depeding on the response from the connected peer.

The three message types in the protocol are:

```
PAY — Sent by the initiator to request a transfer of a given amount.
PAY_ACK — Sent by the receiver to confirm the transfer was accepted.
PAY_REJECT — Sent by the receiver to decline an invalid transfer.
```

The order of the transactions are not important for this solution as peers can have negative balances. But they are only updated depending on the acknowledgement received from the user.

If one of the peer disconnects, we restart both the peers from 0 balances. Inorder to restart from the previous states nodes have to trust each other without persisting the transactions. This is possible if the peers sign the transactions and maintain a linked list which I believe is out of scope for this test.

## Edge Cases

- Negative transfer amounts
- Negative transfer amounts if one of the peer is malicious 
- Bidirectional payments
- Disconnection on cleanup

## Install and Run

### Prerequisites

```
Node.js (v18 or later)
npm
```

### Installation

```bash
npm install
npm run build
npm link
```

### Running the CLI

```bash
start-peer <source-port> [target-host]:<target-port>
```

To start the peers provide the source port, and target port the host is localhost by default.

### Running Tests
```bash
npm test
```