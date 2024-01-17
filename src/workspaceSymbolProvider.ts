"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';

export class ASMWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  constructor(public symbolDocumenter: ASMSymbolDocumenter) {

  }

  provideWorkspaceSymbols(query: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[]> {
    const output: vscode.SymbolInformation[] = [];

    for (const fileName in this.symbolDocumenter.files) {
      if (this.symbolDocumenter.files.hasOwnProperty(fileName)) {
        const table = this.symbolDocumenter.files[fileName];

        for (const name in table.symbols) {
          if (table.symbols.hasOwnProperty(name)) {
            const symbol = table.symbols[name];
            if (symbol.isExported) {
              output.push(new vscode.SymbolInformation(name, symbol.kind, "", symbol.location));
            }
          }
        }
      }
    }

    return output;
  }
}
