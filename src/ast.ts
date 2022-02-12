import Token from "./token";
import { LiteralType } from "./types";

export interface Expr {
  accept<T>(visitor: ExprVisitor<T>): T;
}

export interface ExprVisitor<T> {
  visitBinaryExpr(expr: BinaryExpr): T;
  visitGroupingExpr(expr: GroupingExpr): T;
  visitLiteralExpr(expr: LiteralExpr): T;
  visitUnaryExpr(expr: UnaryExpr): T;
}

export class BinaryExpr implements Expr {
  readonly left: Expr;
  readonly operator: Token;
  readonly right: Expr;

  constructor(left: Expr, operator: Token, right: Expr) {
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitBinaryExpr(this);
  }
}

export class GroupingExpr implements Expr {
  readonly expression: Expr;

  constructor(expr: Expr) {
    this.expression = expr;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitGroupingExpr(this);
  }
}

export class LiteralExpr implements Expr {
  readonly value: LiteralType;

  constructor(value: LiteralType) {
    this.value = value;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitLiteralExpr(this);
  }
}

export class UnaryExpr implements Expr {
  readonly operator: Token;
  readonly right: Expr;

  constructor(operator: Token, right: Expr) {
    this.operator = operator;
    this.right = right;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitUnaryExpr(this);
  }
}

export class AstPrinter implements ExprVisitor<string> {
  private parenthesize(name: string, ...exprs: Array<Expr>) {
    let res = "(";

    res += `${name}`;
    exprs.forEach((expr) => {
      res += ` ${expr.accept(this)}`;
    });
    res += ")";

    return res;
  }

  visitBinaryExpr(expr: BinaryExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: GroupingExpr): string {
    return this.parenthesize("group", expr.expression);
  }

  visitLiteralExpr(expr: LiteralExpr): string {
    return expr.value === null ? "" : expr.value.toString();
  }

  visitUnaryExpr(expr: UnaryExpr): string {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  print(expr: Expr) {
    return expr.accept(this);
  }

  // static main(): void {
  //   const expression = new BinaryExpr(
  //     new UnaryExpr(
  //       new Token(TokenType.MINUS, "-", null, 1),
  //       new LiteralExpr(123)
  //     ),
  //     new Token(TokenType.STAR, "*", null, 1),
  //     new GroupingExpr(new LiteralExpr(45.67))
  //   );

  //   console.log(new AstPrinter().print(expression));
  // }
}
