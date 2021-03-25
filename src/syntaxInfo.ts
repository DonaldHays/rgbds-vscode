'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

class SyntaxInfo {
  instructions: string[];
  preprocessorKeywords: string[];
  registerCodes: string[];
  instructionsJSON: { instructions : [{ [name: string]: any }]};
  
  constructor() {
    const extension = vscode.extensions.getExtension("donaldhays.rgbds-z80")!;
    const instructionsJSONPath = path.join(extension.extensionPath, "instructions.json");
    this.instructionsJSON = JSON.parse(fs.readFileSync(instructionsJSONPath, "utf8"));
    
    const instructions = new Set<string>();
    this.instructionsJSON.instructions.forEach((instruction) => {
      instructions.add(instruction.name.split(" ")[0]);
    });
    
    this.instructions = Array.from(instructions);
    this.preprocessorKeywords = ["include", "incbin", "export", "global", "union", "fragment", "nextu", "endu", "printt", "printv", "printi", "printf", "fail", "warn", "if", "elif", "else", "endc", "purge", "rept", "endr", "opt", "popo", "pusho", "pops", "pushs", "equ", "set", "equs", "macro", "endm", "shift", "charmap", "newcharmap", "setcharmap", "pushc", "popc", "rsreset", "rsset", "rb", "rw", "rl", "db", "dw", "dl", "ds", "section", "rom0", "romx", "vram", "sram", "wram0", "wramx", "oam", "hram", "align", "bank", "load", "endl"];
    this.registerCodes = ["a", "f", "b", "c", "d", "e", "h", "l", "af", "bc", "de", "hl", "hli", "hld", "sp", "pc", "z", "nz", "nc"];
  }
};


export let syntaxInfo = new SyntaxInfo();
