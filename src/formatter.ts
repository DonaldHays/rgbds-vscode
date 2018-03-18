"use strict";

import * as vscode from 'vscode';

export class ASMTypingFormatter implements vscode.OnTypeFormattingEditProvider{
  public provideOnTypeFormattingEdits(document: vscode.TextDocument, position: vscode.Position, ch: string, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
    const lineText = document.lineAt(position.line).text;
    const lineRange = document.lineAt(position.line).range;
    
    const commentIndentRegex = /^(.+?)(\s*)(;.*)$/;
    const result = lineText.match(commentIndentRegex);
    if (result) {
      const pre = result[1];
      const post = result[3];
      if (pre.length < 40) {
        let output = pre;
        while (output.length < 40) {
          output += " ";
        }
        output += post;
        
        return [new vscode.TextEdit(lineRange, output)];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}
