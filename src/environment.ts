import { LoxObject } from "./types";
import Token from "./token";
import { RuntimeError } from "./error";

class Environment {
  readonly values: Map<string, LoxObject> = new Map();

  define(name: string, value: LoxObject): void {
    this.values.set(name, value);
  }

  get(name: Token): LoxObject {
    if (this.values.has(name.lexeme)) return this.values.get(name.lexeme)!;
    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
  }
}
