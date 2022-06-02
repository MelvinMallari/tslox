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
  private readonly isInitializer: boolean;

  constructor(
    declaration: FunctionStmt,
    closure: Environment,
    isInitializer: boolean
  ) {
    this.declaration = declaration;
    this.closure = closure;
    this.isInitializer = isInitializer;
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
      if (this.isInitializer) return this.closure.getAt(0, "this");
      return returnValue.value;
    }

    if (this.isInitializer) return this.closure.getAt(0, "this");
    return null;
  }

  bind(instance: LoxInstance): LoxFunction {
    // create a new environment, nestled inside the method's original closure
    const environment = new Environment(this.closure);
    // declare 'this' as an environment in this nestled enclosure and bind it to the given instance
    environment.define("this", instance);
    return new LoxFunction(this.declaration, environment, this.isInitializer);
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
  // note: instances store state, classes store behavior
  private readonly fields: Map<string, LoxObject> = new Map();

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: Token): LoxObject {
    // we use a map to determine the property's value
    if (this.fields.has(name.lexeme)) return this.fields.get(name.lexeme)!;

    // if there is no matching field, we look for a matching method
    // this is where the distinction between _field_ and _property_ becomes meaningful
    // all fields are properties, when accessing a property, you might get a field
    const method = this.klass.findMethod(name.lexeme);
    if (method) return method.bind(this);

    // if there is no property, we intetionally error, instead of silent return
    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`);
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
  readonly superclass: LoxClass;
  // note: instances store state, classes store behavior
  private readonly methods: Map<string, LoxFunction>;

  constructor(
    name: string,
    superclass: LoxClass,
    methods: Map<string, LoxFunction>
  ) {
    this.name = name;
    this.superclass = superclass;
    this.methods = methods;
  }

  toString(): string {
    return this.name;
  }

  call(interpreter: Interpreter, args: LoxObject[]): LoxObject {
    // when you call a class, it instantiates a new LoxInstance and returns it
    const instance = new LoxInstance(this);

    const initializer = this.findMethod("init");
    // if we have an initializer, we immediately bind & invoke it like a normal method call
    if (initializer) initializer.bind(instance).call(interpreter, args);

    return instance;
  }

  findMethod(name: string): LoxFunction {
    if (name in this.methods) return this.methods.get(name)!;
    if (this.superclass) return this.superclass.findMethod(name);
    return this.methods.get(name)!;
  }

  // number of required params
  arity(): Number {
    const initializer = this.findMethod("init");
    return initializer ? initializer.arity() : 0;
  }
}
