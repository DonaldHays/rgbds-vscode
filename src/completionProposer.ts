"use strict";

import * as vscode from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';
import * as path from 'path';
import * as fs from 'fs';

export class ASMCompletionProposer implements vscode.CompletionItemProvider {
  instructionItems: vscode.CompletionItem[];
  
  constructor(public symbolDocumenter: ASMSymbolDocumenter) {
    this.instructionItems = [];
    
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
          if (entry.aliasHLI) {
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
                "name" : entry.name.replace("hl-", hld),
                "description" : entry.description,
                "cycles" : entry.cycles,
                "bytes" : entry.bytes,
                "flags" : {
                  "z" : entry.flags.z || "",
                  "n" : entry.flags.n || "",
                  "h" : entry.flags.h || "",
                  "c" : entry.flags.c || ""
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
                "name" : entry.name.replace("r8", r8),
                "description" : entry.description.replace("r8", `\`${r8}\``),
                "cycles" : entry.cycles,
                "bytes" : entry.bytes,
                "flags" : {
                  "z" : (entry.flags.z || "").replace("r8", `\`${r8}\``),
                  "n" : (entry.flags.n || "").replace("r8", `\`${r8}\``),
                  "h" : (entry.flags.h || "").replace("r8", `\`${r8}\``),
                  "c" : (entry.flags.c || "").replace("r8", `\`${r8}\``),
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
                "name" : entry.name.replace("r16", r16),
                "description" : entry.description.replace("r16", `\`${r16}\``),
                "cycles" : entry.cycles,
                "bytes" : entry.bytes,
                "flags" : {
                  "z" : (entry.flags.z || "").replace("r16", `\`${r16}\``),
                  "n" : (entry.flags.n || "").replace("r16", `\`${r16}\``),
                  "h" : (entry.flags.h || "").replace("r16", `\`${r16}\``),
                  "c" : (entry.flags.c || "").replace("r16", `\`${r16}\``),
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
        item.documentation = new vscode.MarkdownString(lines.join("  \n"));
        
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
    
    this.instructionItems.forEach((item) => {
      output.push(item);
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
