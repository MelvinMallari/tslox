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
  visitVariableExpr(expr: VariableExpr): T;
  visitAssignExpr(expr: AssignExpr): T;
  visitLogicalExpr(expr: LogicalExpr): T;
  visitCallExpr(expr: CallExpr): T;
  visitGetExpr(expr: GetExpr): T;
  visitSetExpr(expr: SetExpr): T;
}

export interface Stmt {
  accept<T>(visitor: StmtVisitor<T>): T;
}

export interface StmtVisitor<T> {
  visitExpressionStmt(stmt: ExpressionStmt): T;
  visitPrintStmt(stmt: PrintStmt): T;
  visitVarStmt(stmt: VarStmt): T;
  visitBlockStmt(stmt: BlockStmt): T;
  visitIfStmt(stmt: IfStmt): T;
  visitWhileStmt(stmt: WhileStmt): T;
  visitFunctionStmt(stmt: FunctionStmt): T;
  visitReturnStmt(stmt: ReturnStmt): T;
  visitClassStmt(stmt: ClassStmt): T;
}

// ### Expressions ###

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

export class VariableExpr implements Expr {
  readonly name: Token;

  constructor(name: Token) {
    this.name = name;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitVariableExpr(this);
  }
}

export class AssignExpr implements Expr {
  readonly name: Token; // token for variable being assigned to
  readonly value: Expr; // expression for the new value

  constructor(name: Token, value: Expr) {
    this.name = name;
    this.value = value;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitAssignExpr(this);
  }
}

export class LogicalExpr implements Expr {
  readonly left: Expr;
  readonly operator: Token;
  readonly right: Expr;

  constructor(left: Expr, operator: Token, right: Expr) {
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitLogicalExpr(this);
  }
}

export class CallExpr implements Expr {
  readonly callee: Expr;
  readonly paren: Token;
  readonly args: Expr[];

  constructor(callee: Expr, paren: Token, args: Expr[]) {
    this.callee = callee;
    this.paren = paren;
    this.args = args;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitCallExpr(this);
  }
}

export class GetExpr implements Expr {
  readonly object: Expr;
  readonly name: Token;

  constructor(object: Expr, name: Token) {
    this.object = object;
    this.name = name;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitGetExpr(this);
  }
}

export class SetExpr implements Expr {
  readonly object: Expr;
  readonly name: Token;
  readonly value: Expr;

  constructor(object: Expr, name: Token, value: Expr) {
    this.object = object;
    this.name = name;
    this.value = value;
  }

  accept<T>(visitor: ExprVisitor<T>): T {
    return visitor.visitGetExpr(this);
  }
}
// ### Statements ###

export class ExpressionStmt implements Stmt {
  readonly expression: Expr;

  constructor(expression: Expr) {
    this.expression = expression;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitExpressionStmt(this);
  }
}

export class PrintStmt implements Stmt {
  readonly expression: Expr;

  constructor(expression: Expr) {
    this.expression = expression;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitPrintStmt(this);
  }
}

export class VarStmt implements Stmt {
  readonly name: Token;
  readonly initializer: Expr | null;

  constructor(name: Token, initializer: Expr | null = null) {
    this.name = name;
    this.initializer = initializer;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitVarStmt(this);
  }
}

export class BlockStmt implements Stmt {
  readonly statements: Stmt[];

  constructor(statements: Stmt[]) {
    this.statements = statements;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitBlockStmt(this);
  }
}

export class IfStmt implements Stmt {
  readonly condition: Expr;
  readonly thenBranch: Stmt;
  readonly elseBranch: Stmt;

  constructor(condition: Expr, thenBranch: Stmt, elseBranch: Stmt) {
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitIfStmt(this);
  }
}

export class WhileStmt implements Stmt {
  readonly condition: Expr;
  readonly body: Stmt;

  constructor(condition: Expr, body: Stmt) {
    this.condition = condition;
    this.body = body;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitWhileStmt(this);
  }
}

export class FunctionStmt implements Stmt {
  readonly name: Token;
  readonly params: Token[];
  readonly body: Stmt[];

  constructor(name: Token, params: Token[], body: Stmt[]) {
    this.name = name;
    this.params = params;
    this.body = body;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitFunctionStmt(this);
  }
}

export class ReturnStmt implements Stmt {
  readonly keyword: Token;
  readonly value: Expr;

  constructor(keyword: Token, value: Expr) {
    this.keyword = keyword;
    this.value = value;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitReturnStmt(this);
  }
}

export class ClassStmt implements Stmt {
  readonly name: Token;
  // readonly superclass: VariableExpr;
  readonly methods: FunctionStmt[];

  constructor(name: Token, methods: FunctionStmt[]) {
    this.name = name;
    // this.superclass = superclass;
    this.methods = methods;
  }

  accept<T>(visitor: StmtVisitor<T>): T {
    return visitor.visitClassStmt(this);
  }
}

// export class AstPrinter implements ExprVisitor<string> {
//   private parenthesize(name: string, ...exprs: Array<Expr>) {
//     let res = "(";

//     res += `${name}`;
//     for (const expr of exprs) {
//       res += ` ${expr.accept(this)}`;
//     }
//     res += ")";

//     return res;
//   }

//   visitBinaryExpr(expr: BinaryExpr): string {
//     return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
//   }

//   visitGroupingExpr(expr: GroupingExpr): string {
//     return this.parenthesize("group", expr.expression);
//   }

//   visitLiteralExpr(expr: LiteralExpr): string {
//     return expr.value === null ? "" : expr.value.toString();
//   }

//   visitUnaryExpr(expr: UnaryExpr): string {
//     return this.parenthesize(expr.operator.lexeme, expr.right);
//   }

//   print(expr: Expr) {
//     return expr.accept(this);
//   }

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
// }
