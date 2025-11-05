"use strict";

import * as vscode from 'vscode';
import { KeywordFamily, syntaxInfo } from './syntaxInfo';
import { ASMConfiguration } from './configuration';

const whitespaceRegex = /^\s+/
const commentRegex = /^;.*$/
const stringRegex = /^"(?:\\.|[^"])*"/
const identifierRegex = /^#?((?:(?:[a-z_][\w#$@]*)?\.[\w#$@]+)|(?:[a-z_][\w#$@]*)):{0,2}/i
const registerRegex = new RegExp(`^(${syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.Register] }).join("|")})(?![\\w#$@])`, "i");
const conditionCodeRegex = /^(z|nz|nc)(?![\w#$@])/i
const instructionRegex = new RegExp(`^(${syntaxInfo.instructions.join("|")})(?![\\w#$@])`, "i");
const cConditionCodeRegex = /^(call|jp|jr|ret)(\s+)(c)(?![\w#$@])/i
const keywordSectionDeclarationBankRegex = /^(bank)(?![\w#$@])\s*\[/i
const keywordPreprocessorRegex = new RegExp(`^(${syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.Preprocessor] }).filter((keyword) => keyword != "set").join("|")})(?![\\w#$@])`, "i");
const keywordDataDirectiveRegex = new RegExp(`^(${syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.DataDirective] }).join("|")})(?![\\w#$@])`, "i");
const keywordSectionDeclarationRegex = new RegExp(`^(${syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.SectionDeclaration] }).filter((keyword) => keyword != "bank").join("|")})(?![\\w#$@])`, "i");
const keywordFunctionRegex = new RegExp(`^(${syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.Function] }).join("|")})(?![\\w#$@])`, "i");
const hexLiteralRegex = /^(?:\$|0x)([\da-f][_\da-f]*)\b/i

export class ASMFormatter {
  constructor(private config: ASMConfiguration) { }

  private _case(value: string, output: vscode.TextEdit[], line: vscode.TextLine, offset: number, configuration: string | null | undefined) {
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

    const rules = this.config.capitalizationRules;
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

      while (text.length > 0) {
        result = null;
        if ((result = whitespaceRegex.exec(text)) || (result = stringRegex.exec(text)) || (result = commentRegex.exec(text))) {
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = cConditionCodeRegex.exec(text)) {
          this._case(result[1], output, line, offset, this.rule(`language.instruction.${result[1]}`));
          this._case(result[3], output, line, offset + result[1].length + result[2].length, this.rule(`language.conditioncode.${result[3]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = instructionRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.instruction.${result[0]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = keywordPreprocessorRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.preprocessor.${result[0]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = keywordDataDirectiveRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.datadirective.${result[0]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = keywordSectionDeclarationRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.sectiondeclaration.${result[0]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = keywordSectionDeclarationBankRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.sectiondeclaration.${result[0]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = keywordFunctionRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.keyword.function.${result[0]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = registerRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.register.${result[0]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = conditionCodeRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.conditioncode.${result[0]}`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = hexLiteralRegex.exec(text)) {
          this._case(result[0], output, line, offset, this.rule(`language.hex`));
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else if (result = identifierRegex.exec(text)) {
          text = text.substring(result[0].length);
          offset += result[0].length;
        } else {
          // Chomp one unrecognized character.
          text = text.substring(1);
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
