import {
  ExprVisitor,
  GroupingExpr,
  LiteralExpr,
  Expr,
  UnaryExpr,
  BinaryExpr,
} from "./ast";
import { LoxObject } from "./types";
import TokenType from "./tokenType";

// Object is the implementation language type we use to hold Lox values
export class Interpreter implements ExprVisitor<LoxObject> {
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
      case TokenType.MINUS:
        return Number(left) - Number(right);
      // can be used to add numbers & concantenate strings
      case TokenType.PLUS:
        if (typeof left === "number" && typeof right === "number") {
          return Number(left) + Number(right);
        }
        if (typeof left === "string" && typeof right === "string") {
          return String(left) + String(right);
        }
        break;
      case TokenType.SLASH:
        return Number(left) / Number(right);
      case TokenType.STAR:
        return Number(left) * Number(right);
    }

    return null;
  }

  private evaluate(expr: Expr): LoxObject {
    return expr.accept(this);
  }
}
