import Token from "./token";
import TokenType from "./tokenType";
import {
  BinaryExpr,
  Expr,
  GroupingExpr,
  LiteralExpr,
  UnaryExpr,
  Stmt,
  PrintStmt,
  ExpressionStmt,
  VariableExpr,
  VarStmt,
  AssignExpr,
  BlockStmt,
  IfStmt,
  LogicalExpr,
} from "./ast";
import { ParseError } from "./error";
import { error as loxError } from "./lox";

export class Parser {
  private readonly tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): (Stmt | null)[] {
    const statements: (Stmt | null)[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.declaration());
    }
    return statements;
  }

  private declaration(): Stmt | null {
    try {
      if (this.match(TokenType.VAR)) return this.varDeclaration();
      return this.statement();
    } catch (error) {
      this.synchronize();
      return null;
    }
  }

  // expression → assignment ;
  private expression(): Expr {
    return this.assignment();
  }

  // assignment → IDENTIFIER "=" assignment | logic_or ;
  private assignment(): Expr {
    // recursively parser left hand side to figure out what kind of assignment target it is
    // this works because every valid targe also happens to be valid syntax as normal expression
    let expr = this.or();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      // this parsers the right hand side of the assignment, recursively
      // this only needs a single token look ahead!
      const value = this.assignment();

      if (expr instanceof VariableExpr) {
        const name = expr.name;
        return new AssignExpr(name, value);
      }

      // can only assign to variables
      this.error(equals, "Invalid assignment target");
    }

    return expr;
  }

  // logic_or → logic_and ( "or" logic_and )* ;
  private or(): Expr {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new LogicalExpr(expr, operator, right);
    }

    return expr;
  }

  // logic_and → equality ( "and" equality )* ;
  private and(): Expr {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new LogicalExpr(expr, operator, right);
    }
    return expr;
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
    let expr = this.factor();
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

    if (this.match(TokenType.IDENTIFIER))
      return new VariableExpr(this.previous());

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new GroupingExpr(expr);
    }

    // handle the case in which we have a token that cannot start an expression
    throw this.error(this.peek(), "Expect expression");
  }

  private statement(): Stmt {
    if (this.match(TokenType.IF)) return this.ifStatment();
    if (this.match(TokenType.PRINT)) return this.printStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.block());
    return this.expressionStmt();
  }

  // ifStmt → "if" "(" expression ")" statement ( "else" statement )? ;
  private ifStatment(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')', after if condition.");

    const thenBranch = this.statement();
    let elseBranch = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }
    return new IfStmt(condition, thenBranch, elseBranch!);
  }

  private printStatement(): Stmt {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new PrintStmt(value);
  }

  private varDeclaration(): Stmt {
    const name: Token = this.consume(
      TokenType.IDENTIFIER,
      "Expect variable name."
    );

    let initializer: Expr | null = null;
    if (this.match(TokenType.EQUAL)) initializer = this.expression();

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration");
    return new VarStmt(name, initializer);
  }

  private whileStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
    const body = this.statement();

    return new WhileStm();
  }

  private expressionStmt(): Stmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new ExpressionStmt(expr);
  }

  private block(): Stmt[] {
    const statements = [];
    // collect the set of statements scoped by blocks
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration()!);
    }
    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
    return statements;
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

  // checks if current token matches any in input array of types, consumes it if match
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
