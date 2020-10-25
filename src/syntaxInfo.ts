'use strict';

class SyntaxInfo {
  instructions: string[];
  preprocessorKeywords: string[];
  registerCodes: string[];
  
  constructor() {
    this.instructions = ["adc", "add", "and", "bit", "call", "ccf", "cp", "cpl", "daa", "dec", "di", "ei", "halt", "inc", "jp", "jr", "ld", "ldh", "nop", "or", "pop", "push", "res", "ret", "reti", "rl", "rla", "rlc", "rlca", "rr", "rra", "rrc", "rrca", "rst", "sbc", "scf", "set", "sla", "sra", "srl", "stop", "sub", "swap", "xor"];
    this.preprocessorKeywords = ["include", "incbin", "export", "global", "union", "fragment", "nextu", "endu", "printt", "printv", "printi", "printf", "fail", "warn", "if", "elif", "else", "endc", "purge", "rept", "endr", "opt", "popo", "pusho", "pops", "pushs", "equ", "set", "equs", "macro", "endm", "shift", "charmap", "rsreset", "rsset", "rb", "rw", "rl", "db", "dw", "dl", "ds", "section", "rom0", "romx", "vram", "sram", "wram0", "wramx", "oam", "hram", "align", "bank", "load"];
    this.registerCodes = ["a", "f", "b", "c", "d", "e", "h", "l", "af", "bc", "de", "hl", "hli", "hld", "sp", "pc", "z", "nz", "nc"];
  }
};


export let syntaxInfo = new SyntaxInfo();
