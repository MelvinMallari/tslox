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
} from "./ast";
import { runtimeError } from "./lox";
import { LoxObject } from "./types";
import TokenType from "./tokenType";
import Token from "./token";
import { RuntimeError } from "./error";
import Environment from "./environment";

// Object is the implementation language type we use to hold Lox values
export class Interpreter implements ExprVisitor<LoxObject>, StmtVisitor<void> {
  private environment = new Environment();

  interpret(statements: (Stmt | null)[]): void {
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
        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings."
        );
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);
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

  visitVariableExpr(expr: VariableExpr): LoxObject {
    console.log("visitVariableExpr", this.environment);
    return this.environment.get(expr.name);
  }

  visitAssignExpr(expr: AssignExpr): LoxObject {
    const value = this.evaluate(expr);
    this.environment.assign(expr.name, value);
    return value;
  }

  visitExpressionStmt(stmt: ExpressionStmt): void {
    this.evaluate(stmt.expression);
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
    console.log("should be defining in environment here", this.environment);
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
    if (object instanceof Boolean) return Boolean(object);
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
}
