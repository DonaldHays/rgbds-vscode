"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';

export class ASMDefinitionProvider implements vscode.DefinitionProvider {
  constructor(public symbolDocumenter: ASMSymbolDocumenter) {

  }

  provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition> {
    const range = document.getWordRangeAtPosition(position, /(\$[0-9a-fA-F]+)|(%[0-1]+)|([0-9]+)|(\.?[A-Za-z_][A-Za-z_0-9]*(\\@|:*))/g);
    if (range) {
      const text = document.getText(range);
      const symbol = this.symbolDocumenter.symbol(text, document);
      if (symbol) {
        return symbol.location;
      }
    }

    return undefined;
  }
}
