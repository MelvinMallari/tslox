import {
  ExprVisitor,
  StmtVisitor,
  GroupingExpr,
  LiteralExpr,
  Expr,
  UnaryExpr,
  BinaryExpr,
  ExpressionStmt,
  PrintStmt,
  Stmt,
  VarStmt,
  VariableExpr,
  AssignExpr,
  BlockStmt,
  IfStmt,
  LogicalExpr,
  WhileStmt,
  CallExpr,
  FunctionStmt,
  ReturnStmt,
  ClassStmt,
  GetExpr,
  SetExpr,
  ThisExpr,
  SuperExpr,
  TernaryExpr,
} from "./ast";
import { runtimeError } from "./lox";
import {
  isInstanceOfLoxCallable,
  LoxCallable,
  LoxClockFunction,
  LoxFunction,
  LoxFunctionReturn,
  LoxObject,
  LoxClass,
  LoxInstance,
} from "./types";
import TokenType from "./tokenType";
import Token from "./token";
import { RuntimeError } from "./error";
import Environment from "./environment";

// Object is the implementation language type we use to hold Lox values
export class Interpreter implements ExprVisitor<LoxObject>, StmtVisitor<void> {
  // we need a fixed reference to the global environment
  globals = new Environment();
  // the environment field keeps track of the current environment
  // as we enter and exit globals
  private environment = this.globals;
  private locals: Map<Expr, number> = new Map();

  constructor() {
    this.globals.define("clock", new LoxClockFunction());
  }

  interpret(statements: (Stmt | null)[]): void {
    // execute a list of statements, aka a program
    try {
      for (const statement of statements) {
        this.execute(statement!);
      }
    } catch (error) {
      runtimeError(error as RuntimeError);
    }
  }

  public visitLiteralExpr(expr: LiteralExpr): LoxObject {
    return expr.value;
  }

  public visitUnaryExpr(expr: UnaryExpr): LoxObject {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        return -Number(right);
    }

    return null;
  }

  public visitGroupingExpr(expr: GroupingExpr): LoxObject {
    // recursively evaluate the sub expression within the grouping expression
    return this.evaluate(expr.expression);
  }

  public visitBinaryExpr(expr: BinaryExpr): LoxObject {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) > Number(right);
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) >= Number(right);
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) < Number(right);
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) <= Number(right);
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) > Number(right);
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return Number(left) - Number(right);
      // can be used to add numbers & concantenate strings
      case TokenType.PLUS:
        if (typeof left === "number" && typeof right === "number") {
          return Number(left) + Number(right);
        }
        if (typeof left === "string" && typeof right === "string") {
          return String(left) + String(right);
        }
        if (typeof left === "string" || typeof right === "string") {
          return String(left) + String(right);
        }
        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings."
        );
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);
        if (Number(right) === 0) {
          throw new RuntimeError(expr.operator, "Cannot divide by 0");
        }
        return Number(left) / Number(right);
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) * Number(right);
      case TokenType.BANG_EQUAL:
        return this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);
    }

    return null;
  }

  visitTernaryExpr(expr: TernaryExpr): LoxObject {
    const condition = this.evaluate(expr.condition);
    const thenArm = this.evaluate(expr.thenArm);
    const elseArm = this.evaluate(expr.elseArm);
    return Boolean(condition) ? thenArm : elseArm;
  }

  visitVariableExpr(expr: VariableExpr): LoxObject {
    return this.lookUpVariable(expr.name, expr);
  }

  visitAssignExpr(expr: AssignExpr): LoxObject {
    const value = this.evaluate(expr.value);
    const distance = this.locals.get(expr);

    if (distance != null) {
      // walk the fixed number of environments, then stuffs the new value in that map
      this.environment.assignAt(distance, expr.name, value);
    } else {
      // if distance is null, then we know it's a global
      this.globals.assign(expr.name, value);
    }

    // assignment is an expression, e.g.
    // print a = 2; // "2"
    return value;
  }

  // design decision to return values with appropriate truthiness.
  visitLogicalExpr(expr: LogicalExpr): LoxObject {
    const left = this.evaluate(expr.left);

    if (expr.operator.type == TokenType.OR) {
      // if or, and left is truthy return left
      if (this.isTruthy(left)) return left;
    } else {
      // if and, and left is falsy, return left
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitCallExpr(expr: CallExpr): LoxObject {
    // callee is typically a identifier that looks up the function by its name, but could be anything
    const callee = this.evaluate(expr.callee);
    const args = expr.args.map((arg) => this.evaluate(arg));

    // check to see that we can make function calls ith the callee
    // eg we don't have something like "totally not a function"()
    if (!isInstanceOfLoxCallable(callee)) {
      throw new RuntimeError(expr.paren, "Can only call functions and classes");
    }

    const func: LoxCallable = callee;

    if (args.length != func.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${func.arity()} arguments, but got ${args.length}.`
      );
    }

    return func.call(this, args);
  }

  visitGetExpr(expr: GetExpr): LoxObject {
    const object = this.evaluate(expr.object);
    // only class instances have properties
    if (object instanceof LoxInstance) {
      return object.get(expr.name);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  visitSetExpr(expr: SetExpr): LoxObject {
    const object = this.evaluate(expr.object);

    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields.");
    }

    const value = this.evaluate(expr.value);
    object.set(expr.name, value);
    return value;
  }

  visitThisExpr(expr: ThisExpr): LoxObject {
    // remember the expr is passed to look up how many hops to refer to the correct enclosed value
    return this.lookUpVariable(expr.keyword, expr);
  }

  visitExpressionStmt(stmt: ExpressionStmt): void {
    this.evaluate(stmt.expression);
  }

  visitIfStmt(stmt: IfStmt): void {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }
  }

  visitPrintStmt(stmt: PrintStmt): void {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
  }

  visitVarStmt(stmt: VarStmt): void {
    let value: LoxObject = null;

    // if variable has initializer, evaluate it.
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer);
    }
    this.environment.define(stmt.name.lexeme, value);
  }

  visitBlockStmt(stmt: BlockStmt): void {
    // create a new environment for the blocks scope & execute
    this.executeBlock(stmt.statements, new Environment(this.environment));
  }

  visitWhileStmt(stmt: WhileStmt): void {
    // thin wrapper around implementation language's while operator
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  visitFunctionStmt(stmt: FunctionStmt): void {
    // pass the current environment into the LoxFunction to preserve closure
    // this is the environment that is active when the function is declared.
    const func = new LoxFunction(stmt, this.environment, false);
    // declaration also binds the resulting object to a new variable.
    // here we create a new binding in the current environment and store a reference here:
    this.environment.define(stmt.name.lexeme, func);
  }

  visitReturnStmt(stmt: ReturnStmt): void {
    let value = null;
    if (stmt.value !== null) value = this.evaluate(stmt.value);

    throw new LoxFunctionReturn(value);
  }

  visitClassStmt(stmt: ClassStmt): void {
    let superclass = null;
    if (stmt.superclass) {
      // if a class has a superclass expression, evaluate it.
      superclass = this.evaluate(stmt.superclass);
      if (!(superclass instanceof LoxClass)) {
        // super class must evaluates to be a class.
        throw new RuntimeError(
          stmt.superclass.name,
          "Superclass must be a class."
        );
      }
    }

    this.environment.define(stmt.name.lexeme, null);

    let environment = this.environment;
    if (stmt.superclass) {
      // when we evaluate a subclass definition, we creat a new environment
      environment = new Environment(this.environment);
      environment.define("super", superclass);
    }

    const methods: Map<string, LoxFunction> = new Map();

    for (const method of stmt.methods) {
      // method declaration become LoxFunction objects
      const func = new LoxFunction(
        method,
        environment,
        method.name.lexeme === "init"
      );
      methods.set(method.name.lexeme, func);
    }
    // turn the class syntax node into a LoxClass, the runtime representation of a class
    // two stage variable binding process allows references to the class inside its own methods
    const klass = new LoxClass(
      stmt.name.lexeme,
      superclass as LoxClass,
      methods
    );

    if (superclass) {
      environment = environment.enclosing!;
    }

    environment.assign(stmt.name, klass);
  }

  visitSuperExpr(expr: SuperExpr): LoxObject {
    const distance = this.locals.get(expr);
    if (!distance)
      throw new RuntimeError(expr.keyword, "Super expression not found");

    const superclass = this.environment.getAt(distance, "super");
    // we have to find the object that the superclass method is bound too.
    if (!(superclass instanceof LoxClass))
      throw new RuntimeError(expr.keyword, "Invalid super usage");

    const object = this.environment.getAt(distance - 1, "this");
    if (!(object instanceof LoxInstance))
      throw new RuntimeError(expr.keyword, "Invalid super usage");

    // find the method on the super class.
    const method = superclass.findMethod(expr.method.lexeme);
    if (!method) {
      throw new RuntimeError(
        expr.method,
        `Undefined property '${expr.method.lexeme}'`
      );
    }
    return method.bind(object);
  }

  executeBlock(statements: Stmt[], environment: Environment): void {
    const previousEnvironment = this.environment;
    try {
      this.environment = environment;
      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previousEnvironment;
    }
  }

  private lookUpVariable(name: Token, expr: Expr) {
    const distance = this.locals.get(expr);
    return distance !== undefined
      ? this.environment.getAt(distance, name.lexeme)
      : // if distance is undefined, it must not be in locals & is therefore in global scope
        this.globals.get(name);
  }

  private checkNumberOperand(operator: Token, operand: LoxObject) {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operator must be a number.");
  }

  private checkNumberOperands(
    operator: Token,
    left: LoxObject,
    right: LoxObject
  ) {
    if (typeof left === "number" && typeof right === "number") return;
    throw new RuntimeError(operator, "Operator must be a number.");
  }

  private isTruthy(object: LoxObject) {
    if (object === null) return false;
    if (typeof object === "boolean") return Boolean(object);
    return true;
  }

  private isEqual(a: LoxObject, b: LoxObject) {
    if (a === null && b === null) return true;
    if (a === null) return false;
    return a === b;
  }

  private stringify(object: LoxObject): string {
    if (object === null) return "nil";
    if (typeof object === "number") {
      let text = object.toString();
      if (text.endsWith(".0")) text = text.substring(0, text.length - 2);
      return text;
    }
    return object.toString();
  }

  private evaluate(expr: Expr): LoxObject | RuntimeError {
    return expr.accept(this);
  }

  private execute(stmt: Stmt) {
    stmt.accept(this);
  }

  resolve(expr: Expr, depth: number) {
    this.locals.set(expr, depth);
  }
}
