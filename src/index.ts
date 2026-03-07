#!/usr/bin/env node

import inquirer from "inquirer"
import chalk from "chalk"
import figlet from "figlet"
import { Peer } from "./peer.js"
import { CommandType } from "./types.js"
import { Command } from "commander"

const displayTitle = () => {
  console.log(
    chalk.magenta(
      figlet.textSync("P2P", { font: "Banner3-D" })
    )
  )
  console.log("\n")
}

const parsePort = (v: string) => {
    // Only port
    const port = parseInt(v);
    if (isNaN(port)) {
        throw new Error("Must be a valid port number or host:port");
    }

    return { host: '127.0.0.1', port };
}

const parseAddress = (v: string) => {
    const parts = v.split(':');
    
    // Host:Port
    if (parts.length === 2) {
        const host = parts[0];
        const port = parseInt(parts[1]!);

        if (isNaN(port)) {
            throw new Error("Invalid port in host:port string");
        }
        return { host, port };
    }

    return parsePort(v)
}

const program = new Command();

program
    .name("start-peer")
    .description("Peering Relationships")
    .argument("<port>", "port to listen on", parsePort)
    .argument("[target]", "Address of connecting peer (host:port or port)", parseAddress)
    .showHelpAfterError()
    .parse()

const [ source, target ] =  program.processedArgs as { host: string, port: number}[]

// Initialize Peer
const peer = new Peer(source?.port!)

if (target) {
    const attemptConnection = async () => {
      try {
        await peer.connect(target.port, target.host);
      } catch (err) {
        setTimeout(attemptConnection, 3000);
      }
    };
    console.log(chalk.yellow(`Waiting for peer on ${target.host}:${target.port}...`));
    attemptConnection();
}

console.log(chalk.blue("Waiting for incoming connections..."))

peer.on("connected", async () => {
    console.clear()
    console.log(chalk.green("Connected"))
    await cli()
});

peer.on("paid", async(amount)=>{
    console.log(chalk.green("\n#####################################################################"))
    console.log(chalk.green(`         Received payment of ${amount}`))
    console.log(chalk.green("#####################################################################\n"))
})

peer.on("ack", async(id)=>{
    console.log(chalk.green("\n#####################################################################"))
    console.log(chalk.green(`    Received ack for ${id}`))
    console.log(chalk.green("#####################################################################\n"))
})

peer.on("error", async(reason)=>{
    console.log(chalk.red("\n#####################################################################"))
    console.log(chalk.red(`    Received error for ${reason}`))
    console.log(chalk.red("#####################################################################\n"))
})

const cli = async () => {
  displayTitle()

  while(true) {

    // Main menu for the user to choose an action
    const { action } = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: chalk.cyan("Select an action: \n"),
            choices: [ CommandType.Pay, CommandType.Balance, CommandType.Exit ],
        },
    ])

    switch (action) {
      case CommandType.Pay:
        const { amount } = await inquirer.prompt([
            {
                type: "input",
                name: "amount",
                message: chalk.cyan("Enter Amount to transfer: \n"),
            },
        ])

        const id = peer.transfer(amount)
        if(id) {
          console.log(chalk.blue("\n#####################################################################"))
          console.log(chalk.blue(`Transferring amount: ${amount} in id: ${id}`))
          console.log(chalk.blue("#####################################################################\n"))
        }
        continue
      case CommandType.Balance:
        const res = peer.getBalance()
        console.log(chalk.yellow("\n#####################################################################"))
        console.log(chalk.yellow(`                   Your balance is ${res}`))
        console.log(chalk.yellow("#####################################################################\n"))
        continue
      case CommandType.Exit:
        console.log(chalk.yellow("Exiting..."))
        process.exit(0)
    }
  }
}

// Graceful shutdown on force close (e.g., Ctrl+C)
process.on("SIGINT", () => {
  console.log(chalk.yellow("\nGracefully shutting down. Goodbye!"))
  process.exit(0)
})

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.log(chalk.red("\nUnhandled Rejection. Exiting gracefully..."))
  console.error(reason)
  process.exit(1)
})

// Catch uncaught exceptions
process.on("uncaughtException", (error) => {
  console.log(chalk.red("\nUncaught Exception. Exiting gracefully..."))
  process.exit(1)
})
