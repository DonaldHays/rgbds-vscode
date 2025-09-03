"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';

export class ASMDocumentLinkProvider implements vscode.DocumentLinkProvider {
  constructor(public symbolDocumenter: ASMSymbolDocumenter) { }

  provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const filename = document.uri.fsPath;
    const table = this.symbolDocumenter.files[filename];
    if (table == null) {
      return undefined;
    }

    const output: vscode.DocumentLink[] = [];
    for (const include of table.includedFiles) {
      const absolutePath = include.absolutePath;
      if (absolutePath) {
        const link = new vscode.DocumentLink(
          include.range,
          vscode.Uri.file(absolutePath)
        );
        output.push(link);
      }
    }

    return output;
  }

  resolveDocumentLink(
    link: vscode.DocumentLink,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentLink> {
    return null;
  }
}
