import { FunctionStmt } from "./ast";
import Environment from "./environment";
import { Interpreter } from "./interpreter";

export interface LoxCallable {
  arity(): Number;
  call(interpreter: Interpreter, args: LoxObject[]): LoxObject;
}

export type LiteralType = string | number | boolean | null | Object;
export type LoxObject = LoxCallable | Object | string | boolean | number | null;

export const isInstanceOfLoxCallable = (object: any): object is LoxCallable => {
  return "call" in object;
};

export class LoxClockFunction implements LoxCallable {
  arity(): number {
    return 0;
  }

  call(): LoxObject {
    return Date.now().valueOf() / 1000.0;
  }

  toString(): string {
    return "<native fn>";
  }
}

export class LoxFunction implements LoxCallable {
  private readonly declaration;

  constructor(declaration: FunctionStmt) {
    this.declaration = declaration;
  }

  // invokes the function!
  call(interpreter: Interpreter, args: LoxObject[]): LoxObject {
    // create a new environment for the function with the global as the enclosing env
    const environment = new Environment(interpreter.globals);

    /**
     *  parameters are scoped to a function blocks environment
     *  each function call must get its own environment
     *  or else something like recursion breaks it
     */
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    // executes the block and restores the previous environment
    interpreter.executeBlock(this.declaration.body, environment);
    return null;
  }

  arity(): Number {
    return this.declaration.params.length;
  }

  toString(): string {
    return `<fn ${this.declaration.name.lexeme} >`;
  }
}
