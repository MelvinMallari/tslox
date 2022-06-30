import Token from "./token";
import TokenType from "./tokenType";
import { error } from "./error";

export default class Scanner {
  private source: string;
  private tokens: Token[] = [];
  private start: number = 0;
  private current: number = 0;
  private line: number = 1;
  private keywords: Map<string, TokenType> = new Map(
    Object.entries({
      and: TokenType.AND,
      class: TokenType.CLASS,
      else: TokenType.ELSE,
      false: TokenType.FALSE,
      for: TokenType.FOR,
      fun: TokenType.FUN,
      if: TokenType.IF,
      nil: TokenType.NIL,
      or: TokenType.OR,
      print: TokenType.PRINT,
      return: TokenType.RETURN,
      super: TokenType.SUPER,
      this: TokenType.THIS,
      true: TokenType.TRUE,
      var: TokenType.VAR,
      while: TokenType.WHILE,
    })
  );

  constructor(source: string) {
    this.source = source;
  }

  scanTokens() {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.EOF, "", null, this.line));
    return this.tokens;
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private scanToken(): void {
    const char = this.advance();
    switch (char) {
      case "(":
        this.addToken(TokenType.LEFT_PAREN);
        break;
      case ")":
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      case "{":
        this.addToken(TokenType.LEFT_BRACE);
        break;
      case "}":
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      case ",":
        this.addToken(TokenType.COMMA);
        break;
      case ".":
        this.addToken(TokenType.DOT);
        break;
      case "-":
        this.addToken(TokenType.MINUS);
        break;
      case "+":
        this.addToken(TokenType.PLUS);
        break;
      case ";":
        this.addToken(TokenType.SEMICOLON);
        break;
      case "*":
        this.addToken(TokenType.STAR);
        break;
      case "!":
        this.addToken(this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case "=":
        this.addToken(
          this.match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL
        );
        break;
      case "<":
        this.addToken(this.match("=") ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case ">":
        this.addToken(
          this.match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER
        );
        break;
      case "/":
        if (this.match("/")) {
          // a comment goes until the end of the line
          // use peek instead of match so we update line counter in the new line case
          // no need to add a token, we just skip through comments
          while (this.peek() !== "\n" && !this.isAtEnd()) this.advance();
        } else if (this.match("*")) {
          this.blockComment();
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;

      case " ":
      case "\r":
      case "\t":
        // ignore whitespace.
        break;

      case "\n":
        this.line++;
        break;

      case '"':
        this.string();
        break;

      default:
        if (this.isDigit(char)) {
          this.number();
        } else if (this.isAlpha(char)) {
          this.identifier();
        } else {
          error(this.line, "Unexpected character.");
        }
        break;
    }
  }

  // consumes the next character & returns it
  private advance(): string {
    return this.source.charAt(this.current++);
  }

  // lookahead, does not consume character
  private peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.source.charAt(this.current);
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source.charAt(this.current + 1);
  }

  // a conditional advance, only consume character if it's what we're looking for
  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) !== expected) return false;
    this.current++;
    return true;
  }

  // lox supports multi-line strings
  private string(): void {
    while (this.peek() != '"' && !this.isAtEnd()) {
      if (this.peek() == "\n") this.line++;
      this.advance();
    }

    if (this.isAtEnd()) {
      error(this.line, "Unterminated string.");
      return;
    }

    // advance past the closing "
    this.advance();

    // trim the surrounding quotes
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.addTokenWithLiteral(TokenType.STRING, value);
  }

  private number(): void {
    while (this.isDigit(this.peek())) this.advance();

    // handle the decimal point
    if (this.peek() == "." && this.isDigit(this.peekNext())) {
      // consume the decimal point
      this.advance();
      // keep scanning the number
      while (this.isDigit(this.peek())) this.advance();
    }

    // parse the lexeme into a float
    this.addTokenWithLiteral(
      TokenType.NUMBER,
      parseFloat(this.source.substring(this.start, this.current))
    );
  }

  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();
    // follow the maximal much principle— when two lexical grammars
    // can both match a chunk of code, whichever matchers the most chracter wins.
    // check if the identifier is a reserved keyword
    const text = this.source.substring(this.start, this.current);
    let reservedKeyword = this.keywords.get(text);
    //
    this.addToken(reservedKeyword || TokenType.IDENTIFIER);
  }

  private blockComment(): void {
    let openingCommentToken = 1;
    while (openingCommentToken > 0 && !this.isAtEnd()) {
      if (this.peek() == "\n") this.line++;
      this.advance();
      if (this.match("/") && this.match("*")) openingCommentToken++;
      if (this.match("*") && this.match("/")) openingCommentToken--;
    }

    if (this.isAtEnd()) {
      error(this.line, "Unterminated comment.");
      return;
    }
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == "_";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private isDigit(c: string): boolean {
    return c >= "0" && c <= "9";
  }

  private addToken(type: TokenType): void {
    this.addTokenWithLiteral(type, null);
  }

  private addTokenWithLiteral(type: TokenType, literal: null | Object): void {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }
}
