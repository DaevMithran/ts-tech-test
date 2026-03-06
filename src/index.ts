#!/usr/bin/env node

import inquirer from "inquirer"
import chalk from "chalk"
import stringify from "json-stringify-pretty-compact"
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
    const port = parseInt(v)
    if(isNaN(port)) {
        throw new Error("Must be a valid port number (1-65535)")
    }
    return port
}

const program = new Command();

program
    .name("start-peer")
    .description("Peering Relationships")
    .argument("<port>", "port to listen on", parsePort)
    .argument("[target]", "port of connecting peer", parsePort)
    .showHelpAfterError()
    .parse()

const [ port, target ] =  program.processedArgs as number[]

// Initialize Peer
const peer = new Peer(port!)

if (target) {
    const attemptConnection = async () => {
      try {
        await peer.connect(target);
      } catch (err) {
        setTimeout(attemptConnection, 3000);
      }
    };
    console.log(chalk.yellow(`Waiting for peer on port ${target}...`));
    attemptConnection();
}

console.log(chalk.blue("Waiting for incoming connections..."))

peer.on("connected", async () => {
    console.clear()
    console.log(chalk.green("Connected"))
    await cli()
});

peer.on("paid", async(amount)=>{
    console.log(chalk.green("\n Received payment of", amount))
})

peer.on("ack", async(id)=>{
    console.log(chalk.green("\n Received payment acknowledgement for payment id", id))
})

const cli = async () => {
  displayTitle()

  while(true) {

    // Main menu for the user to choose an action
    const { action } = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: chalk.cyan("Select an action:"),
            choices: [ CommandType.Pay, CommandType.Balance, CommandType.Exit ],
        },
    ])

    console.clear()
    displayTitle()

    switch (action) {
      case CommandType.Pay:
        const { amount } = await inquirer.prompt([
            {
                type: "input",
                name: "amount",
                message: chalk.cyan("Enter Amount to transfer:"),
            },
        ])

        console.log(chalk.blue(`Transferring: ${amount}`))
        peer.transfer(amount)
        console.log(chalk.green("Transfer Initialized"))
        continue
      case CommandType.Balance:
        const res = peer.getBalance()
        console.log(chalk.green("Your peer relationship balance is", stringify(res)))
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
