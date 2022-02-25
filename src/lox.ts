import { readFileSync } from "fs";
import Scanner from "./scanner";
import { setHadError, report, getHadError } from "./error";
import * as readline from "readline";
import Token from "./token";
import TokenType from "./tokenType";
import { Parser } from "./parser";
import { AstPrinter } from "./ast";

export const error = (token: Token, message: string) => {
  if (token.type === TokenType.EOF) {
    report(token.line, "at end", message);
  } else {
    report(token.line, `at '${token.lexeme}'`, message);
  }
};

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
  rl.prompt();

  rl.on("line", (line) => {
    line = line.trim();
    if (line === "exit") {
      rl.close();
      rl.removeAllListeners();
      process.exit(64);
    }
    setHadError(false);
    run(line);
    rl.prompt();
  });
};

const run = (src: string): void => {
  const scanner = new Scanner(src);
  const tokens = scanner.scanTokens();
  const parser = new Parser(tokens);
  const expression = parser.parse();

  // stop of there was a syntax error
  if (getHadError()) {
    console.log("had error");
    return;
  }
  if (!expression) {
    console.log("no expression");
    return;
  }

  console.log(new AstPrinter().print(expression));
};

// only run in command line
if (require.main === module) {
  main();
}
