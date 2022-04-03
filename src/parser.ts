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
  WhileStmt,
  CallExpr,
  FunctionStmt,
  ReturnStmt,
  ClassStmt,
} from "./ast";
import { ParseError } from "./error";
import { error as loxError } from "./lox";

export class Parser {
  private readonly tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.declaration()!);
    }
    return statements;
  }

  private declaration(): Stmt | null {
    try {
      if (this.match(TokenType.CLASS)) return this.classDeclaration();
      if (this.match(TokenType.FUN)) return this.function("function");
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

    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(
          TokenType.IDENTIFIER,
          "Expect property name after '.' ."
        );
        expr = new GetExpr(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: Expr): Expr {
    const args: Expr[] = [];

    // check if there are arguments
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255)
          this.error(this.peek(), "Can't have more than 255 arguments.");
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    const paren = this.consume(
      TokenType.RIGHT_PAREN,
      "Expect ')' after arguments."
    );

    return new CallExpr(callee, paren, args);
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
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.IF)) return this.ifStatment();
    if (this.match(TokenType.PRINT)) return this.printStatement();
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.LEFT_BRACE)) return new BlockStmt(this.block());
    return this.expressionStatement();
  }

  private forStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");
    let initializer: Stmt | null;
    if (this.match(TokenType.SEMICOLON)) {
      // ommitted initializer
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      // variable declaration
      initializer = this.varDeclaration();
    } else {
      // expression
      initializer = this.expressionStatement();
    }

    let condition: Expr | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition");

    let increment = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clause.");

    let body = this.statement();

    if (increment !== null) {
      body = new BlockStmt([body, new ExpressionStmt(increment)]);
    }

    if (condition === null) condition = new LiteralExpr(true);
    body = new WhileStmt(condition, body);

    if (initializer !== null) {
      body = new BlockStmt([initializer, body]);
    }

    return body;
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

  private classDeclaration(): Stmt {
    // we've already consumed the class keyword, so what's next should be the class name
    const name = this.consume(TokenType.IDENTIFIER, "Expect class name.");
    this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

    // keep parsing the method declarations until we get closing brace
    const methods: FunctionStmt[] = [];
    // check if we're at the end to prevent inf loop (if not closed)
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.function("method"));
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.");
    return new ClassStmt(name, methods);
  }

  private returnStatement(): Stmt {
    const keyword = this.previous();
    let value = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return new ReturnStmt(keyword, value!);
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

    return new WhileStmt(condition, body);
  }

  private expressionStatement(): Stmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new ExpressionStmt(expr);
  }

  private function(kind: string): FunctionStmt {
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${kind} name.`);
    const parameters = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "can't have more than 255 parameters");
        }

        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameters name")
        );
      } while (this.match(TokenType.COMMA)); // checks if there are more parameters
    }

    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");

    // parse the body and wrap in a function ast node.
    this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);
    const body = this.block();
    return new FunctionStmt(name, parameters, body);
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
