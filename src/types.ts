import { FunctionStmt } from "./ast";
import Environment from "./environment";
import { RuntimeError } from "./error";
import { Interpreter } from "./interpreter";
import Token from "./token";

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
  private readonly closure;

  constructor(declaration: FunctionStmt, closure: Environment) {
    this.declaration = declaration;
    this.closure = closure;
  }

  // invokes the function!
  call(interpreter: Interpreter, args: LoxObject[]): LoxObject {
    // create a new environment for the function with the enclosing env
    const environment = new Environment(this.closure);

    /**
     *  parameters are scoped to a function blocks environment
     *  each function call must get its own environment
     *  or else something like recursion breaks it
     */
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    try {
      // executes the block and restores the previous environment
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (error) {
      const returnValue = error as LoxFunctionReturn;
      return returnValue.value;
    }

    return null;
  }

  arity(): Number {
    return this.declaration.params.length;
  }

  toString(): string {
    return `<fn ${this.declaration.name.lexeme} >`;
  }
}

export class LoxFunctionReturn extends Error {
  readonly value: LoxObject;

  constructor(value: LoxObject) {
    super("");
    this.value = value;
  }
}

export class LoxInstance {
  private klass: LoxClass;
  private readonly fields: Map<string, LoxObject> = new Map();

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: Token): LoxObject {
    if (this.fields.has(name.lexeme)) {
      // we use a map to determine the property's value
      const property = this.fields.get(name.lexeme);
      if (property) return property;
    }

    // if there is no property, we intetionally error, instead of silent return
    throw new RuntimeError(name, `Undefined property '${name.lexeme}.`);
  }

  set(name: Token, value: LoxObject) {
    // put the instance method into the fields map
    this.fields.set(name.lexeme, value);
  }

  toString(): string {
    return `${this.klass.name} instance`;
  }
}

export class LoxClass implements LoxCallable {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  toString(): string {
    return this.name;
  }

  call(interpreter: Interpreter, args: LoxObject[]): LoxObject {
    // when you call a class, it instantiates a new LoxInstance and returns it
    const instance = new LoxInstance(this);
    return instance;
  }

  // number of required params
  arity(): Number {
    return 0;
  }
}
