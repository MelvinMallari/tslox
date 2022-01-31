"use strict";
exports.__esModule = true;
var fs_1 = require("fs");
var readline = require("readline");
var main = function () {
    var args = process.argv.slice(2);
    if (args.length > 1) {
        process.exit(64);
    }
    else if (args.length === 1) {
        runFile(args[0]);
    }
    else {
        runPrompt();
    }
};
var runFile = function (path) {
    var file = (0, fs_1.readFileSync)(path, "utf-8");
    console.log(file);
};
var runPrompt = function () {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "[lox]>"
    });
    rl.on("line", function (line) {
        line = line.trim();
        if (line === "exit") {
            console.log("closing");
            rl.close();
            rl.removeAllListeners();
            process.exit(64);
        }
        rl.prompt();
    });
};
// only run in command line
if (require.main === module) {
    console.log("welcomes to the cli!");
    main();
}
