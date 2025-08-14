'use strict';

import * as vscode from 'vscode';
import { ASMHoverProvider } from "./hover";
import { ASMFormatter, ASMTypingFormatter, ASMDocumentFormatter, ASMDocumentRangeFormatter } from "./formatter";
import { ASMSymbolDocumenter } from "./symbolDocumenter";
import { ASMCompletionProposer } from './completionProposer';
import { ASMDefinitionProvider } from './definitionProvider';
import { ASMDocumentSymbolProvider } from './documentSymbolProvider';
import { ASMWorkspaceSymbolProvider } from './workspaceSymbolProvider';
import { ASMDocumentLinkProvider } from './documentLinkProvider';
import { ASMConfiguration } from './configuration';
import { ASMDocumentWatcher } from './documentWatcher';

export function activate(context: vscode.ExtensionContext) {
  const config = new ASMConfiguration();
  const watcher = new ASMDocumentWatcher();
  const symbolDocumenter = new ASMSymbolDocumenter(watcher, config);
  const formatter = new ASMFormatter(config);

  context.subscriptions.push(vscode.languages.registerHoverProvider(
    { language: "gbz80", scheme: "file" },
    new ASMHoverProvider(symbolDocumenter)
  ));

  context.subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider(
    { language: "gbz80", scheme: "file" },
    new ASMTypingFormatter(formatter),
    " ", ",", ";", ":"
  ));

  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(
    { language: "gbz80", scheme: "file" },
    new ASMDocumentFormatter(formatter)
  ));

  context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(
    { language: "gbz80", scheme: "file" },
    new ASMDocumentRangeFormatter(formatter)
  ));

  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
    { language: "gbz80", scheme: "file" },
    new ASMCompletionProposer(symbolDocumenter, formatter, watcher, config),
    `"`
  ));

  context.subscriptions.push(vscode.languages.registerDefinitionProvider(
    { language: "gbz80", scheme: "file" },
    new ASMDefinitionProvider(symbolDocumenter)
  ));

  context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
    { language: "gbz80", scheme: "file" },
    new ASMDocumentSymbolProvider(symbolDocumenter)
  ));

  context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(
    new ASMWorkspaceSymbolProvider(symbolDocumenter)
  ));

  context.subscriptions.push(vscode.languages.registerDocumentLinkProvider(
    { language: "gbz80", scheme: "file" },
    new ASMDocumentLinkProvider(symbolDocumenter)
  ));
}

// this method is called when your extension is deactivated
export function deactivate() {

}
