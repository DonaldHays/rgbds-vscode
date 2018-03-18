"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';

export class ASMCompletionProposer implements vscode.CompletionItemProvider {
  constructor(public symbolDocumenter: ASMSymbolDocumenter) {
    
  }
  
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    let output: vscode.CompletionItem[] = [];
    
    const registers: string[] = ["a", "f", "b", "c", "d", "e", "h", "l", "af", "bc", "de", "hl", "sp"];
    registers.forEach((register) => {
      output.push(new vscode.CompletionItem(register, vscode.CompletionItemKind.Variable));
    });
    
    const keywords: string[] = ["macro", "endm"];
    keywords.forEach((keyword) => {
      output.push(new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword));
    });
    
    const symbols = this.symbolDocumenter.symbols(document);
    for (const name in symbols) {
      if (symbols.hasOwnProperty(name)) {
        const symbol = symbols[name];
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Constant);
        item.documentation = new vscode.MarkdownString(symbol.documentation);
        output.push(item);
      }
    }
    
    return output;
  }
}
