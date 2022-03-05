import {
  ExprVisitor,
  GroupingExpr,
  LiteralExpr,
  Expr,
  UnaryExpr,
  BinaryExpr,
} from "./ast";
import { runtimeError } from "./lox";
import { LoxObject } from "./types";
import TokenType from "./tokenType";
import Token from "./token";
import { RuntimeError } from "./error";

// Object is the implementation language type we use to hold Lox values
export class Interpreter implements ExprVisitor<LoxObject> {
  interpret(expression: Expr): void {
    try {
      const value: LoxObject = this.evaluate(expression);
      console.log(this.stringify(value));
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

  private isTruthy(object: LoxObject) {
    if (object === null) return false;
    if (object instanceof Boolean) return Boolean(object);
    return true;
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
}
