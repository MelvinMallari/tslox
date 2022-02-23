let hadError = false;

export class ParseError extends Error {
  name = "ParseError";
  private line?: number;
  private where?: string;

  constructor(message: string, line?: number, where?: string) {
    super(message);
    this.message = message;
    this.line = line;
    this.where = where;
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
