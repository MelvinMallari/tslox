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
