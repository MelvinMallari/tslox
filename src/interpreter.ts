import { ExprVisitor, GroupingExpr, LiteralExpr, Expr } from "./ast";
import { LoxObject } from "./types";

// Object is the implementation language type we use to hold Lox values
export class Interpreter implements ExprVisitor<LoxObject> {
  public visitLiteralExpr(expr: LiteralExpr): LoxObject {
    return expr.value;
  }

  public visitGroupingExpr(expr: GroupingExpr): LoxObject {
    // recursively evaluate the sub expression within the grouping expression
    return this.evaluate(expr.expression);
  }

  private evaluate(expr: Expr): LoxObject {
    return expr.accept(this);
  }
}
