import { LoxObject } from "./types";
import Token from "./token";
import { RuntimeError } from "./error";

export default class Environment {
  private values: Record<string, LoxObject> = {};
  private enclosing: Environment | null;

  constructor(enclosing?: Environment) {
    // enclosing like the concept of _closure_
    // null enclosing is for global scope environment.
    // if we have enclosing, we have a nested, tree like structure
    this.enclosing = enclosing ? enclosing : null;
  }

  ancestor(distance: number): Environment {
    let environment: Environment = this;
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing!;
    }
    return environment;
  }

  getAt(distance: number, name: string) {
    return this.ancestor(distance).values[name];
  }

  define(name: string, value: LoxObject): void {
    this.values[name] = value;
  }

  get(name: Token): LoxObject {
    if (name.lexeme in this.values) return this.values[name.lexeme];
    // if the value isn't found in this environment, check the enclosing one
    if (this.enclosing != null) return this.enclosing.get(name);
    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'`);
  }

  assign(name: Token, value: LoxObject): void {
    // variable has to exist or else runtime error
    if (name.lexeme in this.values) {
      this.values[name.lexeme] = value;
      return;
    }

    if (this.enclosing !== null) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }
}
