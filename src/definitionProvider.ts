"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';

export class ASMDefinitionProvider implements vscode.DefinitionProvider {
  constructor(public symbolDocumenter: ASMSymbolDocumenter) {

  }

  provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition> {
    const range = document.getWordRangeAtPosition(position, /((?:\$|0x)[\da-f][_\da-f]*)|((?:\%|0b)[01][_01]*)|((?:\&|0o)[0-7][_0-7]*)|(\`[0-3][_0-3]*)|(\d[_\d]*(\.\d+)?)|((?:(?:[a-z_][\w#$@]*)?\.[\w#$@]+)|(?:[a-z_][\w#$@]*))/gi);
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
