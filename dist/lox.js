"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const readline_1 = __importDefault(require("readline"));
const main = () => {
    const args = process.argv.slice(2);
    if (args.length > 1) {
        process.exit(64);
    }
    else if (args.length === 1) {
        runFile(args[0]);
    }
    else {
        runPrompt();
    }
};
const runFile = (path) => {
    const file = (0, fs_1.readFileSync)(path, "utf-8");
    console.log(file);
};
const runPrompt = () => {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "[lox]>",
    });
    rl.on("line", (line) => {
        line = line.trim();
        console.log(line);
        if (line === "exit") {
            console.log("closing");
            rl.close();
        }
        rl.prompt();
    });
};
if (require.main === module) {
    console.log("welcomes to the cli!");
    main();
}
