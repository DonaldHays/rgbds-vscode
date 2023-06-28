"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';

export class ASMDocumentLinkProvider implements vscode.DocumentLinkProvider {
  constructor(public symbolDocumenter: ASMSymbolDocumenter) {
    
  }

  provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
    const filename = document.uri.fsPath;
    const table = this.symbolDocumenter.files[filename];
    if (table == null) {
        return undefined;
    }
    
    let output: vscode.DocumentLink[] = [];
    for (let i = 0; i < table.includedFiles.length; i++) {
        const include = table.includedFiles[i];
        if (include.fsPath) {
            let link = new vscode.DocumentLink(include.range, vscode.Uri.file(include.fsPath));
            output.push(link);
        }
    }

    return output;
  }

  resolveDocumentLink(link: vscode.DocumentLink, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink> {
    return null;
  }
}
