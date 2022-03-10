import { readFileSync } from "fs";
import Scanner from "./scanner";
import {
  setHadError,
  report,
  getHadError,
  RuntimeError,
  setHadRuntimeError,
  getHadRuntimeError,
} from "./error";
import * as readline from "readline";
import Token from "./token";
import TokenType from "./tokenType";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";

export const runtimeError = (error: RuntimeError): void => {
  console.log(`${error.message} [line "${error.token.line}"]`);
  setHadRuntimeError(true);
};

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
  const statements = parser.parse();
  const interpreter = new Interpreter();

  // stop if there was a syntax error
  if (getHadError()) {
    console.log("had error");
    process.exit(65);
  }

  interpreter.interpret(statements);

  // stop if runtime error
  if (getHadRuntimeError()) {
    console.log("had runtime error");
    process.exit(70);
  }
};

// only run in command line
if (require.main === module) {
  main();
}
