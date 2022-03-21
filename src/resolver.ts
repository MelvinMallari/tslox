import { ExprVisitor, StmtVisitor } from "./ast";
import { Interpreter } from "./interpreter";

class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private readonly interpreter: Interpreter;
  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }
}
