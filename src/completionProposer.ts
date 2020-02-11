"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';
import * as path from 'path';
import * as fs from 'fs';
import { ASMFormatter } from './formatter';

const registerRegex = /\b\[?(a|f|b|c|d|e|h|l|af|bc|de|hl|hli|hld|sp|pc)\]?\b/i
const itemSplitRegex = /,? /
const hexRegex = /(\$[0-9a-f]+)/i

const includeRegex = /^(?:[\w\.]+[:]{0,2})?\s*include\s+\"?/i
const strictIncludeRegex = /^(?:[\w\.]+[:]{0,2})?\s*include\s+\"?$/i
const firstWordRegex = /^(?:[\w\.]+[:]{0,2})?\s*\w*$/
const sectionRegex = /^(?:[\w\.]+[:]{0,2})?\s*section\b/i

export class ASMCompletionProposer implements vscode.CompletionItemProvider {
  asmFilePaths: Set<string>;
  instructionItems: vscode.CompletionItem[];

  constructor(public symbolDocumenter: ASMSymbolDocumenter, public formatter: ASMFormatter) {
    this.asmFilePaths = new Set();
    this.instructionItems = [];
    
    vscode.workspace.findFiles("**/*.{z80,inc,asm}", null, undefined).then((files) => {
      files.forEach((fileURI) => {
        this.asmFilePaths.add(fileURI.fsPath);
      });
    });
    
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.{z80,inc,asm}");
    watcher.onDidCreate((uri) => {
      this.asmFilePaths.add(uri.fsPath);
    });
    
    watcher.onDidDelete((uri) => {
      this.asmFilePaths.delete(uri.fsPath);
    });

    const extension = vscode.extensions.getExtension("donaldhays.rgbds-z80")!;
    const instructionsJSONPath = path.join(extension.extensionPath, "instructions.json");
    const instructionsJSON = JSON.parse(fs.readFileSync(instructionsJSONPath, "utf8"));
    const instructions = instructionsJSON["instructions"];

    const r8Values = ["a", "b", "c", "d", "e", "h", "l"];
    const r16Values = ["bc", "de", "hl"];
    const hliValues = ["hl+", "hli"];
    const hldValues = ["hl-", "hld"];

    instructions.forEach((instructionJSON: any) => {
      const output: any[] = [instructionJSON];
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
  
  _fileRelativeDirectories(document: vscode.TextDocument): string[] {
    let output: string[] = [];
    
    output.push(path.dirname(document.fileName));
    
    // Grab the configured include paths. If it's a string, make it an array.
    var includePathConfiguration: any = vscode.workspace.getConfiguration().get("rgbdsz80.includePath");
    if (typeof includePathConfiguration === "string") {
      includePathConfiguration = [includePathConfiguration];
    }
    
    // For each configured include path
    for (var i = 0; i < includePathConfiguration.length; i++) {
      var includePath: string = includePathConfiguration[i];
      
      // If the path is relative, make it absolute starting from workspace root.
      if (path.isAbsolute(includePath) == false) {
        if (vscode.workspace.workspaceFolders !== undefined) {
          includePath = path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, includePath);
        }
      }
      
      output.push(includePath);
    }
    
    return output;
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    let prefix = document.getText(new vscode.Range(position.with({ character: 0 }), position));
    
    let lineContext = new Set();
    
    if (firstWordRegex.test(prefix)) {
      lineContext.add("firstWord");
    } else {
      lineContext.add("notFirstWord");
    }
    
    if (sectionRegex.test(prefix)) {
      lineContext.add("section");
    }
    
    if (includeRegex.test(prefix)) {
      lineContext.add("include");
    }
    
    let output: vscode.CompletionItem[] = [];
    
    if (context.triggerCharacter == `"` || strictIncludeRegex.test(prefix)) {
      if (lineContext.has("include") == false) {
        return output;
      }
      
      let shouldIncludeQuotes = prefix.indexOf(`"`) == -1;
      let directories = this._fileRelativeDirectories(document);
      
      this.asmFilePaths.forEach((filePath) => {
        // Don't include self in the list
        if (filePath == document.fileName) {
          return;
        }
        
        for (let directoryIndex = 0; directoryIndex < directories.length; directoryIndex++) {
          let directory = directories[directoryIndex];
          let relative = path.relative(directory, filePath);
          
          // Don't include parent files in the list
          if (relative.indexOf("..") != -1) {
            continue;
          }
          
          if (shouldIncludeQuotes) {
            output.push(new vscode.CompletionItem(`"${relative}"`, vscode.CompletionItemKind.File));
          } else {
            output.push(new vscode.CompletionItem(relative, vscode.CompletionItemKind.File));
          }
          return;
        }
      });
      return output;
    }

    this.instructionItems.forEach((item) => {
      item.label = this._formatSnippet(item.label);
      if (item.insertText != undefined) {
        if (typeof item.insertText == "string") {
          item.insertText = this._formatSnippet(item.insertText);
        } else {
          item.insertText.value = this._formatSnippet(item.insertText.value);
        }
      }
    });

    const ruleCollections = [
      { "context": ["notFirstWord"], "rule": "language.register", "kind": vscode.CompletionItemKind.Variable, "items": ["a", "f", "b", "c", "d", "e", "h", "l", "af", "bc", "de", "hl", "hli", "hld", "pc", "sp"] },
      { "context": ["notFirstWord"], "rule": "language.conditioncode", "kind": vscode.CompletionItemKind.Value, "items": ["c", "nc", "z", "nz"] },
      
      { "context": ["firstWord"], "rule": "language.keyword.preprocessor", "kind": vscode.CompletionItemKind.Keyword, "items": ["include", "export", "global", "union", "nextu", "endu", "printt", "printv", "printi", "printf", "fail", "warn", "if", "elif", "else", "endc", "purge", "rept", "endr", "opt", "popo", "pusho", "pops", "pushs", "endm", "shift", "charmap"] },
      { "context": ["firstWord"], "rule": "language.keyword.preprocessor", "kind": vscode.CompletionItemKind.Keyword, "items": ["equ", "equs", "macro", "set"] },
      
      { "context": ["firstWord"], "rule": "language.keyword.datadirective", "kind": vscode.CompletionItemKind.Keyword, "items": ["rsreset", "rsset"] },
      { "context": [], "rule": "language.keyword.datadirective", "kind": vscode.CompletionItemKind.Keyword, "items": ["rb", "rw", "rl", "db", "dw", "dl", "ds"] },
      
      { "context": ["firstWord"], "rule": "language.keyword.sectiondeclaration", "kind": vscode.CompletionItemKind.Keyword, "items": ["section"] },
      { "context": ["section"], "rule": "language.keyword.sectiondeclaration", "kind": vscode.CompletionItemKind.Keyword, "items": ["rom0", "romx", "vram", "sram", "wram0", "wramx", "oam", "hram", "align", "bank"] },
      
      { "context": [], "rule": "language.keyword.function", "kind": vscode.CompletionItemKind.Function, "items": ["mul", "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "strcat", "strcmp", "strin", "strlen", "strlwr", "strsub", "strupr", "bank", "def", "high", "low"] },
    ]
    
    let roughKeywords: {[name: string] : string} = {};

    ruleCollections.forEach((collection) => {
      let hasEveryContext = true;
      for (let contextIndex = 0; contextIndex < collection.context.length; contextIndex++) {
        hasEveryContext = hasEveryContext && lineContext.has(collection.context[contextIndex]);
      }
      
      if (hasEveryContext == false) {
        collection.items.forEach((item) => {
          let rule = this.formatter.rule(`${collection.rule}.${item}`);
          
          let cased = item;
          if (rule == "upper") {
            cased = item.toUpperCase();
          }
          
          roughKeywords[item] = cased;
        })
        return;
      }
      
      collection.items.forEach((item) => {
        let rule = this.formatter.rule(`${collection.rule}.${item}`);
        
        let cased = item;
        if (rule == "upper") {
          cased = item.toUpperCase();
        }
        
        output.push(new vscode.CompletionItem(cased, collection.kind));
        
        roughKeywords[item] = cased;
      })
    });
    
    if (lineContext.has("firstWord")) {
      if (vscode.workspace.getConfiguration().get("rgbdsz80.showInstructionCompletionSuggestions") || false) {
        this.instructionItems.forEach((item) => {
          output.push(item);
        });
      }
      
      if (prefix.indexOf(":") == -1) {
        let macroItem = new vscode.CompletionItem("macro", vscode.CompletionItemKind.Snippet);
        macroItem.insertText = new vscode.SnippetString(`\${1:name}: ${roughKeywords["macro"]}\n\t$0\n${roughKeywords["endm"]}`);
        macroItem.detail = "Macro Definition";
        let macroDocumentation = new vscode.MarkdownString();
        macroDocumentation.appendCodeblock(`name: ${roughKeywords["macro"]}\n\n${roughKeywords["endm"]}`, "gbz80");
        macroItem.documentation = macroDocumentation;
        output.push(macroItem);
      }
      
      let repeatItem = new vscode.CompletionItem("rept", vscode.CompletionItemKind.Snippet);
      repeatItem.insertText = new vscode.SnippetString(`${roughKeywords["rept"]} \${1:count}\n\$0\n${roughKeywords["endr"]}`);
      repeatItem.detail = "Repeat Block";
      let repeatDocumentation = new vscode.MarkdownString();
      repeatDocumentation.appendCodeblock(`${roughKeywords["rept"]} count\n\n${roughKeywords["endr"]}`, "gbz80");
      repeatItem.documentation = repeatDocumentation;
      output.push(repeatItem);
    }
    
    let triggerWordRange = document.getWordRangeAtPosition(position, /[\S]+/);
    let triggerWord = document.getText(triggerWordRange);

    const symbols = this.symbolDocumenter.symbols(document);
    for (const name in symbols) {
      if (symbols.hasOwnProperty(name)) {
        const symbol = symbols[name];
        let kind = vscode.CompletionItemKind.Constant;
        if (symbol.kind == vscode.SymbolKind.Function) {
          kind = vscode.CompletionItemKind.Function;
        }
        const item = new vscode.CompletionItem(name, kind);
        item.documentation = new vscode.MarkdownString(symbol.documentation);
        
        if (triggerWord.indexOf(".") == 0 && item.label.indexOf(".") == 0) {
          item.insertText = item.label.substring(1);
        }
        
        output.push(item);
      }
    }

    return output;
  }
}
