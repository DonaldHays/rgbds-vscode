"use strict";

import * as vscode from 'vscode';

const whitespaceRegex = /^\s+/
const commentRegex = /^;.*$/
const stringRegex = /^"(?:\\.|[^"])*"/
const identifierRegex = /^([a-zA-Z_][a-zA-Z_0-9]*[:]{0,2})\b/
const registerRegex = /^(a|f|b|c|d|e|h|l|af|bc|de|hl|hli|hld|sp|pc)\b/i
const conditionCodeRegex = /^(z|nz|nc)\b/i
const instructionRegex = /^(adc|add|and|bit|call|ccf|cp|cpl|daa|dec|di|ei|halt|inc|jp|jr|ld|ldh|nop|or|pop|push|res|ret|reti|rl|rla|rlc|rlca|rr|rra|rrc|rrca|rst|sbc|scf|sla|sra|srl|stop|sub|swap|xor)\b/i
const instructionSetRegex = /^(\s*)(set)\b(.*)$/i
const setExpressionRegex = /^(\s*[_a-z][_a-z0-9]+\s*)(set)\b(.*)$/i
const cConditionCodeRegex = /^(call|jp|jr|ret)(\s+)(c)\b/i
const keywordSectionDeclarationBankRegex = /^(bank)\b\s*\[/i
const keywordPreprocessorRegex = /^(include|incbin|export|global|union|fragment|nextu|endu|printt|printv|printi|printf|fail|warn|if|elif|else|endc|purge|rept|endr|opt|popo|pusho|pops|pushs|equ|equs|macro|endm|shift|charmap|newcharmap|setcharmap|pushc|popc|load|endl)\b/i
const keywordDataDirectiveRegex = /^(rsreset|rsset|rb|rw|rl|db|dw|dl|ds)\b/i
const keywordSectionDeclarationRegex = /^(section|rom0|romx|vram|sram|wram0|wramx|oam|hram|align)\b/i
const keywordFunctionRegex = /^(mul|sin|cos|tan|asin|acos|atan|atan2|strcat|strcmp|strin|strlen|strlwr|strsub|strupr|bank|def|high|low|isconst)\b/i
const hexLiteralRegex = /^(\$[0-9a-f]+)\b/i

export class ASMFormatter {
  private _case(value: string, output: vscode.TextEdit[], line: vscode.TextLine, offset: number, configuration: string|null|undefined) {
    if (configuration == "upper") {
      let newValue = value.toUpperCase();
      if (value != newValue) {
        output.push(new vscode.TextEdit(new vscode.Range(line.range.start.translate(0, offset), line.range.start.translate(0, offset + value.length)), newValue));
      }
    }
    else if (configuration == "lower") {
      let newValue = value.toLowerCase();
      if (value != newValue) {
        output.push(new vscode.TextEdit(new vscode.Range(line.range.start.translate(0, offset), line.range.start.translate(0, offset + value.length)), newValue));
      }
    }
  }
  
  rule(name: string): string | null {
    name = name.toLowerCase();
    
    let rules: { [key: string]: string|null} = vscode.workspace.getConfiguration().get("rgbdsz80.formatting.capitalization") || {};
    let components = name.split(".");
    
    while (components.length > 0) {
      let testRule = components.join(".");
      if (rules[testRule] !== undefined) {
        return rules[testRule];
      }
      
      components.pop();
    }
    
    return null;
  }
  
  format(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions): vscode.ProviderResult<vscode.TextEdit[]> {
    let startLineNumber = document.lineAt(range.start).lineNumber;
    let endLineNumber = document.lineAt(range.end).lineNumber;
    
    let output: vscode.TextEdit[] = [];
    
    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
      let line = document.lineAt(lineNumber);
      let text = line.text;
      let offset = 0;
      
      let result: (RegExpExecArray | null) = null;
      
      if (result = instructionSetRegex.exec(text)) {
        this._case(result[2], output, line, result[1].length, this.rule(`language.instruction.${result[2]}`));
      } else if (result = setExpressionRegex.exec(text)) {
        this._case(result[2], output, line, result[1].length, this.rule(`language.keyword.preprocessor.${result[2]}`));
      }
      
      while (text.length > 0) {
        result = null;
        if ((result = whitespaceRegex.exec(text)) || (result = stringRegex.exec(text)) || (result = commentRegex.exec(text))) {
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = cConditionCodeRegex.exec(text)) {
          this._case(result[1], output, line, offset, this.rule(`language.instruction.${result[1]}`));
          this._case(result[3], output, line, offset + result[1].length + result[2].length, this.rule(`language.conditioncode.${result[3]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = instructionRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.instruction.${result[0]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = keywordPreprocessorRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.preprocessor.${result[0]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = keywordDataDirectiveRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.datadirective.${result[0]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = keywordSectionDeclarationRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.sectiondeclaration.${result[0]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = keywordSectionDeclarationBankRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.sectiondeclaration.${result[0]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = keywordFunctionRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.function.${result[0]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = registerRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.register.${result[0]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = conditionCodeRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.conditioncode.${result[0]}`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = hexLiteralRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.hex`));
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else if (result = identifierRegex.exec(text)) {
          text = text.substr(result[0].length);
          offset += result[0].length;
        } else {
          // Chomp one unrecognized character.
          text = text.substr(1);
          offset += 1;
        }
      }
    }
    
    return output;
  }
}

export class ASMDocumentFormatter implements vscode.DocumentFormattingEditProvider {
  constructor(public formatter: ASMFormatter) { }
  
  provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
    return this.formatter.format(document, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length - 1)), options);
  }
}

export class ASMDocumentRangeFormatter implements vscode.DocumentRangeFormattingEditProvider {
  constructor(public formatter: ASMFormatter) { }
  
  provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
    return this.formatter.format(document, range, options);
  }
}

export class ASMTypingFormatter implements vscode.OnTypeFormattingEditProvider {
  constructor(public formatter: ASMFormatter) { }
  
  public provideOnTypeFormattingEdits(document: vscode.TextDocument, position: vscode.Position, ch: string, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
    return this.formatter.format(document, document.lineAt(position.line).range, options);
  }
}
