import Token from "./token";
import TokenType from "./tokenType";
import { BinaryExpr, Expr, GroupingExpr, LiteralExpr, UnaryExpr } from "./ast";
import { ParseError } from "./error";
import { error as loxError } from "./lox";

export class Parser {
  private readonly tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expr | null {
    try {
      return this.expression();
    } catch (error) {
      return null;
    }
  }

  // expression → equality ;
  private expression(): Expr {
    return this.equality();
  }

  // equality → comparison ( ( "!=" | "==" ) comparison )* ;
  // ( ... )* translates to while loop, * postfix represents 0 or more.
  private equality(): Expr {
    let expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  // comparison → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
  private comparison(): Expr {
    let expr = this.term();

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL
      )
    ) {
      const operator = this.previous();
      const right = this.term();
      expr = new BinaryExpr(expr, operator, right);
    }

    return expr;
  }

  // term → factor ( ( "-" | "+" ) factor )* ;
  private term(): Expr {
    let expr = this.term();
    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.term();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  // factor → unary ( ( "/" | "*" ) unary )* ;
  private factor(): Expr {
    let expr = this.unary();
    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.term();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  // unary → ( "!" | "-" ) unary | primary ;

  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new UnaryExpr(operator, right);
    }

    return this.primary();
  }

  // primary → NUMBER | STRING | "true" | "false" | "nil" | | "(" expression ")" ;
  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new LiteralExpr(false);
    if (this.match(TokenType.TRUE)) return new LiteralExpr(true);
    if (this.match(TokenType.NIL)) return new LiteralExpr(null);

    if (this.match(TokenType.NUMBER, TokenType.STRING))
      return new LiteralExpr(this.previous().literal);

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new GroupingExpr(expr);
    }

    // handle the case in which we have a token that cannot start an expression
    throw this.error(this.peek(), "Expect expression");
  }

  private error(token: Token, message: string): ParseError {
    loxError(token, message);
    return token.type === TokenType.EOF
      ? new ParseError(message, token.line, "at end")
      : new ParseError(message, token.line, `at '${token.lexeme}'`);
  }

  // discard tokens until we're right at the beginning of the next statement
  // this best effort & isn't perfect (e.g. colons in for loops)
  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type == TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  // checks if current token matches any in input array of types
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private check(type: TokenType): boolean {
    return this.isAtEnd() ? false : this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
