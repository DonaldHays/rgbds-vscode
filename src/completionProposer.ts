"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';
import * as path from 'path';
import { ASMFormatter } from './formatter';
import { KeywordFamily, KeywordRuleContext, syntaxInfo } from './syntaxInfo';
import { ASMConfiguration } from './configuration';
import { ASMDocumentWatcher } from './documentWatcher';

const registerRegex = new RegExp(`\\b\\[?(${syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.Register] }).join("|")})\\]?\\b`, "i");
const itemSplitRegex = /,? /
const hexRegex = /(\$[0-9a-f]+)/i

const includeRegex = /^\s*(?:[\w\.]+[:]{0,2})?\s*include\s+\"?/i
const strictIncludeRegex = /^\s*(?:[\w\.]+[:]{0,2})?\s*include\s+(?:\"[^\"]*)?$/i
const firstWordRegex = /^(?:[\w\.]+[:]{0,2})?\s*\w*$/
const sectionRegex = /^(?:[\w\.]+[:]{0,2})?\s*section\b/i
const multiInstructionLineStart = /::\s*\w*$/

const ruleCollections = [
  { "context": [KeywordRuleContext.NotFirstWord], "rule": "language.register", "kind": vscode.CompletionItemKind.Variable, "items": syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.Register] }) },
  { "context": [KeywordRuleContext.NotFirstWord], "rule": "language.conditioncode", "kind": vscode.CompletionItemKind.Value, "items": syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.ConditionCode] }) },

  { "context": [KeywordRuleContext.FirstWord], "rule": "language.keyword.preprocessor", "kind": vscode.CompletionItemKind.Keyword, "items": syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.Preprocessor] }) },

  { "context": [KeywordRuleContext.FirstWord], "rule": "language.keyword.datadirective", "kind": vscode.CompletionItemKind.Keyword, "items": syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.DataDirective], hasContext: [KeywordRuleContext.FirstWord] }) },
  { "context": [], "rule": "language.keyword.datadirective", "kind": vscode.CompletionItemKind.Keyword, "items": syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.DataDirective], hasContext: [KeywordRuleContext.Any] }) },

  { "context": [KeywordRuleContext.FirstWord], "rule": "language.keyword.sectiondeclaration", "kind": vscode.CompletionItemKind.Keyword, "items": syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.SectionDeclaration], hasContext: [KeywordRuleContext.FirstWord] }) },
  { "context": [KeywordRuleContext.Section], "rule": "language.keyword.sectiondeclaration", "kind": vscode.CompletionItemKind.Keyword, "items": syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.SectionDeclaration], hasContext: [KeywordRuleContext.Section] }) },

  { "context": [], "rule": "language.keyword.function", "kind": vscode.CompletionItemKind.Function, "items": syntaxInfo.keywordsQuery({ hasFamily: [KeywordFamily.Function] }) },
]

export class ASMCompletionProposer implements vscode.CompletionItemProvider {
  includeFilePaths: Set<string>;
  instructionItems: vscode.CompletionItem[];

  constructor(
    public symbolDocumenter: ASMSymbolDocumenter,
    public formatter: ASMFormatter,
    private watcher: ASMDocumentWatcher,
    private config: ASMConfiguration
  ) {
    this.includeFilePaths = new Set();
    this.instructionItems = [];

    vscode.workspace.onDidChangeConfiguration((change) => {
      const key = "rgbdsz80.includeSuggestionExtensions";
      if (change.affectsConfiguration(key)) {
        this.includeFilePaths.clear();

        const newExtensions = this.config.includeSuggestionExtensions;
        for (const file of this.watcher.getFilesWithExtensions(newExtensions)) {
          this.includeFilePaths.add(file.path);
        };
      }
    });

    const extensions = this.config.includeSuggestionExtensions;
    for (const file of this.watcher.getFilesWithExtensions(extensions)) {
      this.includeFilePaths.add(file.path);
    };

    this.watcher.onDidAdd((file) => {
      if (this.config.includeSuggestionExtensions.has(file.extension)) {
        this.includeFilePaths.add(file.path);
      }
    });

    this.watcher.onDidRemove((file) => {
      this.includeFilePaths.delete(file.path);
    });

    const instructions = syntaxInfo.instructionsJSON.instructions;

    const r8Values = ["a", "b", "c", "d", "e", "h", "l"];
    const r16Values = ["bc", "de", "hl"];
    const hliValues = ["hl+", "hli"];
    const hldValues = ["hl-", "hld"];

    instructions.forEach((instructionJSON) => {
      const output = [instructionJSON];
      var needsToLoop = true;
      while (needsToLoop) {
        needsToLoop = false;

        for (let index = 0; index < output.length; index++) {
          const entry = output[index];
          if (entry.optionalA) {
            output.splice(index, 1);

            output.push({
              "name": entry.name,
              "description": entry.description,
              "cycles": entry.cycles,
              "bytes": entry.bytes,
              "flags": {
                "z": entry.flags.z || "",
                "n": entry.flags.n || "",
                "h": entry.flags.h || "",
                "c": entry.flags.c || ""
              }
            });

            output.push({
              "name": entry.name.replace("a, ", ""),
              "description": entry.description,
              "cycles": entry.cycles,
              "bytes": entry.bytes,
              "flags": {
                "z": entry.flags.z || "",
                "n": entry.flags.n || "",
                "h": entry.flags.h || "",
                "c": entry.flags.c || ""
              }
            });

            needsToLoop = true;
            break;
          } else if (entry.aliasHLI) {
            output.splice(index, 1);

            hliValues.forEach((hli) => {
              const newOutput = {
                "name": entry.name.replace("hl+", hli),
                "description": entry.description,
                "cycles": entry.cycles,
                "bytes": entry.bytes,
                "flags": {
                  "z": entry.flags.z || "",
                  "n": entry.flags.n || "",
                  "h": entry.flags.h || "",
                  "c": entry.flags.c || ""
                }
              };

              output.push(newOutput);
            });

            needsToLoop = true;
            break;
          } else if (entry.aliasHLD) {
            output.splice(index, 1);

            hldValues.forEach((hld) => {
              const newOutput = {
                "name": entry.name.replace("hl-", hld),
                "description": entry.description,
                "cycles": entry.cycles,
                "bytes": entry.bytes,
                "flags": {
                  "z": entry.flags.z || "",
                  "n": entry.flags.n || "",
                  "h": entry.flags.h || "",
                  "c": entry.flags.c || ""
                }
              };

              output.push(newOutput);
            });

            needsToLoop = true;
            break;
          } else if (entry.name.indexOf("r8") != -1) {
            output.splice(index, 1);

            r8Values.forEach((r8) => {
              const newOutput = {
                "name": entry.name.replace("r8", r8),
                "description": entry.description.replace("r8", `\`${r8}\``),
                "cycles": entry.cycles,
                "bytes": entry.bytes,
                "flags": {
                  "z": (entry.flags.z || "").replace("r8", `\`${r8}\``),
                  "n": (entry.flags.n || "").replace("r8", `\`${r8}\``),
                  "h": (entry.flags.h || "").replace("r8", `\`${r8}\``),
                  "c": (entry.flags.c || "").replace("r8", `\`${r8}\``),
                }
              };

              output.push(newOutput);
            });

            needsToLoop = true;
            break;
          } else if (entry.name.indexOf("r16") != -1) {
            output.splice(index, 1);

            r16Values.forEach((r16) => {
              const newOutput = {
                "name": entry.name.replace("r16", r16),
                "description": entry.description.replace("r16", `\`${r16}\``),
                "cycles": entry.cycles,
                "bytes": entry.bytes,
                "flags": {
                  "z": (entry.flags.z || "").replace("r16", `\`${r16}\``),
                  "n": (entry.flags.n || "").replace("r16", `\`${r16}\``),
                  "h": (entry.flags.h || "").replace("r16", `\`${r16}\``),
                  "c": (entry.flags.c || "").replace("r16", `\`${r16}\``),
                }
              };

              output.push(newOutput);
            });

            needsToLoop = true;
            break;
          }
        }
      }

      output.forEach((element) => {
        const item = new vscode.CompletionItem(element.name, vscode.CompletionItemKind.Snippet);
        // const nameLine = `\`${element.name}\``;
        const descriptionLine = element.description;
        const cyclesLine = `**Cycles:** ${element.cycles} **Bytes:** ${element.bytes}`;
        const flagsLine = `**Flags:**`;
        const flagLines: string[] = [];
        if ((element.flags.z || "").length > 0) {
          flagLines.push(`\\- Z: ${element.flags.z}`);
        }
        if ((element.flags.n || "").length > 0) {
          flagLines.push(`\\- N: ${element.flags.n}`);
        }
        if ((element.flags.h || "").length > 0) {
          flagLines.push(`\\- H: ${element.flags.h}`);
        }
        if ((element.flags.c || "").length > 0) {
          flagLines.push(`\\- C: ${element.flags.c}`);
        }
        const lines = [descriptionLine, "", cyclesLine];
        if (flagLines.length > 0) {
          lines.push(flagsLine);
          flagLines.forEach((line) => {
            lines.push(line);
          });
        }
        item.documentation = new vscode.MarkdownString(lines.join("  \\\n"));

        let insertText: string = element.name;
        let tabIndex = 1;

        insertText = insertText.replace("$", "\\$");

        insertText = insertText.replace(/\b(n8|n16|e8|u3|cc|vec)\b/g, (substring: string) => {
          return `\${${tabIndex++}:${substring}}`;
        });

        // If there's only one completion item, set index to 0 for a better
        // experience.
        if (tabIndex == 2) {
          insertText = insertText.replace("${1:", "${0:");
        }

        if (insertText != element.name) {
          // console.log(insertText);
          item.insertText = new vscode.SnippetString(insertText);
        }

        this.instructionItems.push(item);
      });
    });
  }

  _formatSnippet(snippet: string) {
    let components = snippet.split(itemSplitRegex);
    let instructionRule = this.formatter.rule(`language.instruction.${components[0].toLowerCase()}`);
    if (instructionRule == "upper") {
      components[0] = components[0].toUpperCase();
    } else {
      components[0] = components[0].toLowerCase();
    }

    for (let componentIndex = 1; componentIndex < components.length; componentIndex++) {
      let match = null;

      if (match = registerRegex.exec(components[componentIndex])) {
        let instructionRule = this.formatter.rule(`language.register.${components[componentIndex].toLowerCase()}`);

        if (instructionRule == "upper") {
          components[componentIndex] = components[componentIndex].replace(registerRegex, match[1].toUpperCase());
        } else {
          components[componentIndex] = components[componentIndex].replace(registerRegex, match[1].toLowerCase());
        }
      }

      if (match = hexRegex.exec(components[componentIndex])) {
        let hexRule = this.formatter.rule(`language.hex`);

        if (hexRule == "upper") {
          components[componentIndex] = components[componentIndex].replace(hexRegex, match[1].toUpperCase());
        } else {
          components[componentIndex] = components[componentIndex].replace(hexRegex, match[1].toLowerCase());
        }
      }
    }

    if (components.length > 0) {
      let head = components.splice(0, 1);
      return `${head} ${components.join(", ")}`;
    } else {
      return components[0];
    }
  }

  _includePathDirectories(): string[] {
    let output: string[] = [];

    if (vscode.workspace.workspaceFolders !== undefined) {
      output.push(vscode.workspace.workspaceFolders[0].uri.fsPath);
    }

    // For each configured include path
    for (let includePath of this.config.includePaths) {
      // If the path is relative, make it absolute starting from workspace root.
      if (path.isAbsolute(includePath) == false) {
        if (vscode.workspace.workspaceFolders !== undefined) {
          includePath = path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, includePath);
        }
      }

      output.push(includePath);
    }

    // Sort so that subdirectories appear before their parent directories.
    output.sort((a, b) => {
      if (path.relative(a, b).indexOf("..") !== -1) {
        return -1;
      } else if (path.relative(b, a).indexOf("..") !== -1) {
        return 1;
      } else {
        return 0;
      }
    });

    return output;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    // Fetch the line up until the current character.
    const prefix = document.getText(
      new vscode.Range(position.with({ character: 0 }), position)
    );

    // Generate a set of tags, based on the prefix, that describe the editing
    // context.
    const lineContext = new Set<string>();

    // "firstWord" means the user is typing the first identifier on a line.
    if (firstWordRegex.test(prefix)) {
      lineContext.add("firstWord");
    } else {
      lineContext.add("notFirstWord");
    }

    // "section" means the user is typing a section directive.
    if (sectionRegex.test(prefix)) {
      lineContext.add("section");
    }

    // "include" means the user is typing an include directive.
    if (includeRegex.test(prefix)) {
      lineContext.add("include");
    }

    // "multiInstructionLineStart" means the user is typing the first identifier
    // after `::`.
    if (multiInstructionLineStart.test(prefix)) {
      lineContext.add("multiInstructionLineStart");
    }

    const output: vscode.CompletionItem[] = [];

    // If we're typing a filename in an include directive, propose filenames.
    if (context.triggerCharacter == `"` || strictIncludeRegex.test(prefix)) {
      if (lineContext.has("include") == false) {
        // If we're in a `"`, but _not_ an include directive, then we're
        // actually just in a string literal, so propose nothing.
        return output;
      }

      const finalDoubleQuoteIndex = prefix.lastIndexOf(`"`);
      const shouldIncludeQuotes = (finalDoubleQuoteIndex == -1);
      const directories = this._includePathDirectories();

      for (const filePath of this.includeFilePaths) {
        // Don't include self in the list
        if (filePath == document.fileName) {
          continue;
        }

        for (const directory of directories) {
          const relative = path.relative(directory, filePath);

          // Don't include parent files in the list
          if (relative.indexOf("..") != -1) {
            continue;
          }

          // Format path for windows, and add quotes
          let includePath = relative.split("\\").join("/");

          if (shouldIncludeQuotes) {
            includePath = `"${includePath}"`;
          } else {
            // Only show paths that match what's already been typed.
            const alreadyTyped = prefix.substring(finalDoubleQuoteIndex + 1);
            if (includePath.indexOf(alreadyTyped) !== 0) {
              continue;
            }

            // If there's directory separators, trim the suggestion.
            const slashIndex = alreadyTyped.lastIndexOf("/");
            if (slashIndex !== -1) {
              includePath = includePath.substring(slashIndex + 1);
            }
          }

          output.push(new vscode.CompletionItem(includePath, vscode.CompletionItemKind.File));
          break;
        }
      }

      // Return now, because the only valid completions in this context are
      // filenames.
      return output;
    }

    // Apply the current formatting rules to the instruction items. A bit hacky
    // to be doing it here, but it guarantees the instructions will respect the
    // current formatting configuration whenever a completion prompt appears.
    for (const item of this.instructionItems) {
      item.label = this._formatSnippet(item.label as string);
      if (item.insertText != undefined) {
        if (typeof item.insertText == "string") {
          item.insertText = this._formatSnippet(item.insertText);
        } else {
          item.insertText.value = this._formatSnippet(item.insertText.value);
        }
      }
    }

    // Add items from the rule collections based on the current context.
    RULE_LOOP: for (const collection of ruleCollections) {
      // Don't add items from this collection if they don't match the line
      // context.
      for (const ruleContext of collection.context) {
        if (!lineContext.has(ruleContext)) {
          continue RULE_LOOP;
        }
      }

      // Append all items for this collection.
      for (const item of collection.items) {
        const rule = this.formatter.rule(`${collection.rule}.${item}`);
        const cased = (rule == "upper") ? item.toUpperCase() : item;

        output.push(new vscode.CompletionItem(cased, collection.kind));
      }
    }

    // Add instructions.
    if (lineContext.has("firstWord") || lineContext.has("multiInstructionLineStart")) {
      if (this.config.showInstructionCompletionSuggestions) {
        for (const item of this.instructionItems) {
          output.push(item);
        }
      }
    }

    // Add symbols.
    const triggerWordRange = document.getWordRangeAtPosition(position, /[\S]+/);
    const triggerWord = document.getText(triggerWordRange);

    const symbols = this.symbolDocumenter.symbols(document);
    for (const [name, symbol] of symbols) {
      let kind = vscode.CompletionItemKind.Constant;
      if (symbol.kind == vscode.SymbolKind.Function) {
        kind = vscode.CompletionItemKind.Function;
      }
      const item = new vscode.CompletionItem(name, kind);
      item.documentation = new vscode.MarkdownString(symbol.documentation);

      if (triggerWord.indexOf(".") == 0 && name.indexOf(".") == 0) {
        item.insertText = name.substring(1);
      }

      if (symbol.isLocal && symbol.scope && symbol.scope.end) {
        const symbolRange = new vscode.Range(symbol.scope.start, symbol.scope.end);
        if (symbolRange.contains(position) == false) {
          continue;
        }
      }

      output.push(item);
    }

    return output;
  }
}
