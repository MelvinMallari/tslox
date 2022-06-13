import Token from "./token";

let hadError = false;
let hadRunTimeError = false;

export class ParseError extends Error {
  name = "ParseError";
  line?: number;
  where?: string;

  constructor(message: string, line?: number, where?: string) {
    super(message);
    this.message = message;
    this.line = line;
    this.where = where;
  }
}

export class RuntimeError extends Error {
  readonly token: Token;

  constructor(token: Token, message: string) {
    super(message);
    this.token = token;
    this.message = message;
  }
}

export const error = (line: number, message: string): void => {
  report(line, "", message);
};

export const report = (line: number, where: string, msg: string) => {
  console.log(`[line "${line}"] Error ${where}: ${msg}`);
  setHadError(true);
};

export const setHadError = (error: boolean): void => {
  hadError = error;
};

export const getHadError = (): boolean => hadError;

export const setHadRuntimeError = (error: boolean): void => {
  hadRunTimeError = error;
};

export const getHadRuntimeError = (): boolean => hadRunTimeError;
