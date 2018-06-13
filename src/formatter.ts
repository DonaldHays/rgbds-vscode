"use strict";

import * as vscode from 'vscode';

export class ASMFormatter {
  format(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions): vscode.ProviderResult<vscode.TextEdit[]> {
    return null;
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
    // const lineText = document.lineAt(position.line).text;
    // const lineRange = document.lineAt(position.line).range;
    
    // const commentIndentRegex = /^(.+?)(\s*)(;.*)$/;
    // const result = lineText.match(commentIndentRegex);
    // if (result) {
    //   const pre = result[1];
    //   const post = result[3];
    //   if (pre.length < 40) {
    //     let output = pre;
    //     while (output.length < 40) {
    //       output += " ";
    //     }
    //     output += post;
        
    //     return [new vscode.TextEdit(lineRange, output)];
    //   } else {
    //     return null;
    //   }
    // } else {
    //   return null;
    // }
  }
}
