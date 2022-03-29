import {
  AssignExpr,
  BinaryExpr,
  BlockStmt,
  CallExpr,
  ExpressionStmt,
  ExprVisitor,
  FunctionStmt,
  GroupingExpr,
  IfStmt,
  LiteralExpr,
  LogicalExpr,
  PrintStmt,
  ReturnStmt,
  StmtVisitor,
  UnaryExpr,
  VariableExpr,
  VarStmt,
  WhileStmt,
} from "./ast";
import { Interpreter } from "./interpreter";
import { Stmt, Expr } from "./ast";
import { error } from "./lox";
import Token from "./token";

// the resolver is semantically analyzes the code.
// this means that it inspects the user's program, finds every variable mentioned
// & figures out which declaration each refers to
// our analysis will resolve variable bindings — we'll know what expression that variable is & what variable that is
class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private readonly interpreter: Interpreter;
  private readonly scopes: Map<string, boolean>[] = [];

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
      this.scopes[-1].get(expr.name.lexeme) === false
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

  visitFunctionStmt(stmt: FunctionStmt): void {
    this.declare(stmt.name);
    // unlike variables, define eagerly so that the function may refer to itself recursively
    this.define(stmt.name);
    this.resolveFunction(stmt);
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
    if (stmt.value !== null) {
      this.resolveExpression(stmt.value);
    }
  }

  visitWhileStmt(stmt: WhileStmt): void {
    this.resolveExpression(stmt.condition);
    this.resolveStatement(stmt.body);
  }

  visitBinaryExpr(expr: BinaryExpr): void {
    this.resolveExpression(expr.left);
    this.resolveExpression(expr.right);
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

  private resolveFunction(func: FunctionStmt) {
    this.beginScope();
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolve(func.body);
    this.endScope();
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

    const scope = this.scopes[-1];
    // adds to the inner most scope so it shadows outer ones
    scope.set(name.lexeme, false);
  }

  // marks a variable's value in the scope map as fully initialized & available for use
  private define(name: Token): void {
    if (this.scopes.length === 0) return;
    this.scopes[-1].set(name.lexeme, true);
  }
}
