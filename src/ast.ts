import Token from "./token";

type Expr = BinaryExpr | GroupingExpr | LiteralExpr | UnaryExpr;

export type BinaryExpr = { left: Expr; operator: Token; right: Expr };
export type GroupingExpr = { expression: Expr };
export type LiteralExpr = { value: Object };
export type UnaryExpr = { operator: Token; right: Expr };
