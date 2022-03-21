# tslox

a typescript implementation of the lox programming language as outlined in _crafting interpreters_ by Bob Nystrom.

### grammar

```
program        → declaration* EOF ;

declaration    → funDecl
               | varDecl
               | statement ;

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

assignment     → IDENTIFIER "=" assignment
               | equality ;

logic_or       → logic_and ( "or" logic_and )* ;

logic_and      → equality ( "and" equality )* ;

equality       → comparison ( ( "!=" | "==" ) comparison )* ;

comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;

term           → factor ( ( "-" | "+" ) factor )* ;

factor         → unary ( ( "/" | "*" ) unary )* ;

unary          → ( "!" | "-" ) unary | call;

call           → primary ( "(" arguments? ")" )* ;

arguments      → expression ( "," expression )* ;

primary        → "true" | "false" | "nil"
               | NUMBER | STRING
               | "(" expression ")"
               | IDENTIFIER ;
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
