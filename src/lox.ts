import { readFileSync } from "fs";
import * as readline from "readline";

const main = (): void => {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    process.exit(64);
  } else if (args.length === 1) {
    runFile(args[0]);
  } else {
    runPrompt();
  }
};

const runFile = (path: string) => {
  const file = readFileSync(path, "utf-8");
  run(file);
};

const runPrompt = (): void => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "[lox]>",
  });

  rl.on("line", (line) => {
    line = line.trim();
    if (line === "exit") {
      console.log("exiting");
      rl.close();
      rl.removeAllListeners();
      process.exit(64);
    }
    rl.prompt();
  });
};

const run = (src: string): void => {
  console.log(src);
};

// only run in command line
if (require.main === module) {
  main();
}
