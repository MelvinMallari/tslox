# tslox

a typescript implementation of the lox programming language as outlined in _Crafting Interpreters_ by Bob Nystrom.

I've added support for the following:

- nested block comments
- ternary operator
- string conversion on addition
- divide by 0 runtime error
- anonymous/lambda function arguments

### grammar

```
program        → declaration* EOF ;

declaration    → classDecl
               | funDecl
               | varDecl
               | statement ;

classDecl      → "class" IDENTIFIER ( "<" IDENTIFIER )?
                 "{" function* "}" ;

funDecl        → "fun" function ;

function       → IDENTIFIER "(" parameters? ")" block ;

parameters     → IDENTIFIER ( "," IDENTIFIER )* ;

statement      → exprStmt
               | forStmt
               | ifStmt
               | printStmt
               | returnStmt
               | whileStmt
               | block ;

returnStmt     → "return" expression? ";" ;

exprStmt       → expression ";" ;

forStmt        → "for" "(" ( varDecl | exprStmt | ";" )
                 expression? ";"
                 expression? ")" statement ;

ifStmt         → "if" "(" expression ")" statement
               ( "else" statement )? ;

printStmt      → "print" expression ";" ;

whileStmt      → "while" "(" expression ")" statement ;

block          → "{" declaration* "}" ;

varDecl        → "var" IDENTIFIER ( "=" expression )? ";" ;

expression     → assignment ;

assignment     → ( call "." )? IDENTIFIER "=" assignment
               | ternary ;

ternary        → logic_or ("?" expression ":" expression )?;

logic_or       → logic_and ( "or" logic_and )* ;

logic_and      → equality ( "and" equality )* ;

equality       → comparison ( ( "!=" | "==" ) comparison )* ;

comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;

term           → factor ( ( "-" | "+" ) factor )* ;

factor         → unary ( ( "/" | "*" ) unary )* ;

unary          → ( "!" | "-" ) unary | call;

call           → primary ( "(" arguments? ")" | "." IDENTIFIER )* ;

arguments      → expression | lambda ( "," expression | lambda )* ;

lambda         → "fun" "(" parameters? ")" block ;

primary        → "true" | "false" | "nil" | "this"
               | NUMBER | STRING | IDENTIFIER | "(" expression ")"
               | "super" "." IDENTIFIER ;

```

### how to read grammar notation:

instead of repeating a set of rules, allow of a series using separated pipes (|)

```
bread → "toast" | "biscuits" | "English muffin" ;
```

allow parentheses for grouping:

```
protein → ( "scrambled" | "poached" | "fried" ) "eggs" ;
```

use postfix \* to allow previous symbol or groups of symbol to be repeated 0 or more times.

```
crispiness → "really" "really"\* ;
```

use + to require preceding production to appear at least once

```
crispiness → "really"+ ;
```

use ? for an optional production. 0 or 1 time, but no more

```
breakfast → protein ( "with" breakfast "on the side" )? ;
```

using these representations, we can represent the context-free grammar as:

```
breakfast → protein ( "with" breakfast "on the side" )?
| bread ;

protein → "really"+ "crispy" "bacon"
| "sausage"
| ( "scrambled" | "poached" | "fried" ) "eggs" ;

bread → "toast" | "biscuits" | "English muffin" ;
```

### useful commands

```
tsc; node dist/lox.js src/program.txt
```
