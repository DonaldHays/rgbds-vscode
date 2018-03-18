'use strict';

import * as vscode from 'vscode';
import { ASMHoverProvider } from "./hover";
// import { ASMTypingFormatter } from "./formatter";
import { ASMSymbolDocumenter } from "./symbolDocumenter";
import { ASMCompletionProposer } from './completionProposer';
import { ASMDefinitionProvider } from './definitionProvider';

export function activate(context: vscode.ExtensionContext) {
  const symbolDocumenter = new ASMSymbolDocumenter();

  context.subscriptions.push(vscode.languages.registerHoverProvider({ language: "gbz80", scheme: "file" }, new ASMHoverProvider(symbolDocumenter)));
  // context.subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider({ language: "gbz80", scheme: "file" }, new ASMTypingFormatter(), " ", ",", ";"));
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "gbz80", scheme: "file" }, new ASMCompletionProposer(symbolDocumenter)));
  context.subscriptions.push(vscode.languages.registerDefinitionProvider({ language: "gbz80", scheme: "file" }, new ASMDefinitionProvider(symbolDocumenter)));
}

// this method is called when your extension is deactivated
export function deactivate() {
}