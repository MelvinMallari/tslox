import { LoxObject } from "./types";
import Token from "./token";
import { RuntimeError } from "./error";

export default class Environment {
  private values: Record<string, LoxObject>;

  constructor(values = {}) {
    this.values = values;
  }

  define(name: string, value: LoxObject): void {
    this.values[name] = value;
    console.log("define", this.values);
  }

  get(name: Token): LoxObject {
    console.log("in environment", this.values, name.lexeme);
    if (name.lexeme in this.values) return this.values[name.lexeme];
    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
  }

  assign(name: Token, value: LoxObject): void {
    // variable has to exist or else runtime error
    if (name.lexeme in this.values) {
      this.values[name.lexeme] = value;
      return;
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }
}
