import {
  BlockStmt,
  ExprVisitor,
  StmtVisitor,
  VariableExpr,
  VarStmt,
} from "./ast";
import { Interpreter } from "./interpreter";
import { Stmt, Expr } from "./ast";
import { error } from "./lox";
import Token from "./token";

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

  resolve(statements: Stmt[]): void {
    statements.forEach((statement) => this.resolveStatement(statement));
  }

  resolveLocal(expr: Expr, name: Token): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
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
