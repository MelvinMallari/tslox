import {
  AssignExpr,
  BinaryExpr,
  BlockStmt,
  CallExpr,
  ClassStmt,
  ExpressionStmt,
  ExprVisitor,
  FunctionStmt,
  GetExpr,
  GroupingExpr,
  IfStmt,
  LambdaExpr,
  LiteralExpr,
  LogicalExpr,
  PrintStmt,
  ReturnStmt,
  SetExpr,
  StmtVisitor,
  SuperExpr,
  TernaryExpr,
  ThisExpr,
  UnaryExpr,
  VariableExpr,
  VarStmt,
  WhileStmt,
} from "./ast";
import { Interpreter } from "./interpreter";
import { Stmt, Expr } from "./ast";
import { error } from "./lox";
import Token from "./token";

enum FunctionType {
  NONE,
  FUNCTION,
  INITIALIZER,
  METHOD,
}

enum ClassType {
  NONE,
  CLASS,
  SUBCLASS,
}

// the resolver is semantically analyzes the code.
// this means that it inspects the user's program, finds every variable mentioned
// & figures out which declaration each refers to
// our analysis will resolve variable bindings — we'll know what expression that variable is & what variable that is
export class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private readonly interpreter: Interpreter;
  private readonly scopes: Map<string, boolean>[] = [];
  private currentFunction: FunctionType = FunctionType.NONE;
  private currentClass = ClassType.NONE;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  visitBlockStmt(stmt: BlockStmt): void {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
  }

  visitVarStmt(stmt: VarStmt): void {
    this.declare(stmt.name);
    if (stmt.initializer !== null) {
      this.resolveExpression(stmt.initializer);
    }
    this.define(stmt.name);
  }

  visitVariableExpr(expr: VariableExpr): void {
    if (
      !(this.scopes.length === 0) &&
      this.scopes[this.scopes.length - 1].get(expr.name.lexeme) === false
    ) {
      error(expr.name, "Can't read local variable in its own initializer.");
    }

    this.resolveLocal(expr, expr.name);
  }

  visitAssignExpr(expr: AssignExpr): void {
    // resolve the expression in case it contains references to other variables
    this.resolveExpression(expr.value);
    // resolve the variable that it's being assigned to
    this.resolveLocal(expr, expr.name);
  }

  visitThisExpr(expr: ThisExpr): void {
    if (this.currentClass === ClassType.NONE) {
      error(expr.keyword, "can't use 'this' outside of a class.");
      return;
    }
    this.resolveLocal(expr, expr.keyword);
  }

  visitLambdaExpr(expr: LambdaExpr): void {
    this.beginScope();
    for (const param of expr.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(expr.body);
    this.endScope();
  }

  visitFunctionStmt(stmt: FunctionStmt): void {
    this.declare(stmt.name);
    // unlike variables, define eagerly so that the function may refer to itself recursively
    this.define(stmt.name);
    this.resolveFunction(stmt, FunctionType.FUNCTION);
  }

  visitExpressionStmt(stmt: ExpressionStmt): void {
    this.resolveExpression(stmt.expression);
  }

  visitIfStmt(stmt: IfStmt): void {
    this.resolveExpression(stmt.condition);
    this.resolveStatement(stmt.thenBranch);
    if (stmt.elseBranch !== null) this.resolveStatement(stmt.elseBranch);
  }

  visitPrintStmt(stmt: PrintStmt): void {
    this.resolveExpression(stmt.expression);
  }

  visitReturnStmt(stmt: ReturnStmt): void {
    // because we keep track of the current function scope,
    // we can tell whether we're in a function
    if (this.currentFunction === FunctionType.NONE) {
      error(stmt.keyword, "Can't return from top-level code");
    }
    if (stmt.value !== null) {
      if (this.currentFunction === FunctionType.INITIALIZER) {
        error(stmt.keyword, "Can't return a value from an intiailizer");
      }
      this.resolveExpression(stmt.value);
    }
  }

  visitWhileStmt(stmt: WhileStmt): void {
    this.resolveExpression(stmt.condition);
    this.resolveStatement(stmt.body);
  }

  visitClassStmt(stmt: ClassStmt): void {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;

    this.declare(stmt.name);
    this.define(stmt.name);

    if (
      stmt.superclass !== null &&
      stmt.name.lexeme == stmt.superclass.name.lexeme
    ) {
      error(stmt.superclass.name, "A class can't inherit from itself.");
    }

    if (stmt.superclass) {
      this.currentClass = ClassType.SUBCLASS;
      this.resolveExpression(stmt.superclass);
    }

    if (stmt.superclass !== null) {
      this.beginScope();
      this.scopes[this.scopes.length - 1].set("super", true);
    }

    // this sits in the scope between the class and the methods
    this.beginScope();
    this.scopes[this.scopes.length - 1].set("this", true);

    for (let method of stmt.methods) {
      let declaration = FunctionType.METHOD;
      if (method.name.lexeme === "init") declaration = FunctionType.INITIALIZER;
      this.resolveFunction(method, declaration);
    }

    this.endScope();

    if (stmt.superclass !== null) this.endScope();

    this.currentClass = enclosingClass;
  }

  visitBinaryExpr(expr: BinaryExpr): void {
    this.resolveExpression(expr.left);
    this.resolveExpression(expr.right);
  }

  visitTernaryExpr(expr: TernaryExpr): void {
    this.resolveExpression(expr.condition);
    this.resolveExpression(expr.thenArm);
    this.resolveExpression(expr.elseArm);
  }

  visitCallExpr(expr: CallExpr): void {
    this.resolveExpression(expr.callee);
    for (const arg of expr.args) {
      this.resolveExpression(arg);
    }
  }

  visitGroupingExpr(expr: GroupingExpr): void {
    this.resolveExpression(expr.expression);
  }

  visitLiteralExpr(_: LiteralExpr): void {}

  visitLogicalExpr(expr: LogicalExpr): void {
    this.resolveExpression(expr.left);
    this.resolveExpression(expr.right);
  }

  visitUnaryExpr(expr: UnaryExpr): void {
    this.resolveExpression(expr.right);
  }

  visitGetExpr(expr: GetExpr): void {
    this.resolveExpression(expr.object);
  }

  visitSetExpr(expr: SetExpr): void {
    this.resolveExpression(expr.value);
    this.resolveExpression(expr.object);
  }

  visitSuperExpr(expr: SuperExpr): void {
    if (this.currentClass === ClassType.NONE) {
      error(expr.keyword, "Can't use 'super' outside of a class.");
    } else if (this.currentClass !== ClassType.SUBCLASS) {
      error(
        expr.keyword,
        "Can't use 'super' keyword in a class with no superclass."
      );
    }
    /**
     * resolve super like a variable.
     * resolution stores the number of hops along the environment chain
     * that the interpreter needs to walk to find where the super class is stored
     */
    this.resolveLocal(expr, expr.keyword);
  }

  resolve(statements: Stmt[]): void {
    statements.forEach((statement) => this.resolveStatement(statement));
  }

  resolveLocal(expr: Expr, name: Token): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        // pass how many "hops" we had to take to maintain closure consistency
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }

  private resolveFunction(func: FunctionStmt, type: FunctionType) {
    // stash the current function in a local variable first
    // this is because Lox has nested function declarations
    const enclosingFunction: FunctionType = this.currentFunction;
    this.currentFunction = type;
    this.beginScope();
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(func.body);
    this.endScope();
    // once we're done resolving the function, return current function back to enclosed function
    this.currentFunction = enclosingFunction;
  }

  private resolveStatement(stmt: Stmt) {
    stmt.accept(this);
  }

  private resolveExpression(expr: Expr) {
    expr.accept(this);
  }

  private beginScope(): void {
    /**
     * each element in the stack represents a single block scope
     * keys, in the environment are variable names
     * values represent whether we have finished resolving that variable's initializer
     */
    this.scopes.push(new Map());
  }

  private endScope(): void {
    this.scopes.pop();
  }

  private declare(name: Token): void {
    if (this.scopes.length === 0) return;

    const scope = this.scopes[this.scopes.length - 1];
    if (scope.has(name.lexeme)) {
      error(name, "Already a variable with this name in this scope.");
    }
    // adds to the inner most scope so it shadows outer ones
    scope.set(name.lexeme, false);
  }

  // marks a variable's value in the scope map as fully initialized & available for use
  private define(name: Token): void {
    if (this.scopes.length === 0) return;
    this.scopes[this.scopes.length - 1].set(name.lexeme, true);
  }
}
