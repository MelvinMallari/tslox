let hadError = false;

const error = (line: number, message: string): void => {
  report(line, "", message);
};

const report = (line: number, where: string, msg: string) => {
  console.log(`[line "${line}"] Error ${where}: ${msg}`);
};

export const setHadError = (error: boolean): void => {
  hadError = error;
};

export const getHadError = (): boolean => hadError;
