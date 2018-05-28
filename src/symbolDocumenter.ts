'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

const commentLineRegex = /^;(.*)$/
const endCommentRegex = /^[^;]+;(.*)$/
const includeLineRegex = /^include[\s]+"([^"]+)".*$/i
const spacerRegex = /^(.)\1{3,}$/
const labelDefinitionRegex = /^([a-zA-Z_][a-zA-Z_0-9]*[:]{0,2}).*$/
const defineExpressionRegex = /^[\s]*[a-zA-Z_][a-zA-Z_0-9]*[\s]+(equ|equs|set)[\s]+.*$/i
const instructionRegex = /^(adc|add|and|bit|call|ccf|cp|cpl|daa|dec|di|ei|halt|inc|jp|jr|ld|ldh|nop|or|pop|push|res|ret|reti|rl|rla|rlc|rlca|rr|rra|rrc|rrca|rst|sbc|scf|set|sla|sra|srl|stop|sub|swap|xor)$/i
const keywordRegex = /^(section|pops|pushs|equ|set|equs|macro|endm|shift|rsset|rsreset|rb|rw|rl|export|global|purge|db|dw|dl|ds|incbin|include|union|nextu|endu|printt|printv|printi|printf|rept|endr|fail|warn|if|elif|else|endc|opt|popo|pusho|rom0|romx|vram|sram|wram0|wramx|oam|hram|bank|align|acos|asin|atan|atan2|charmap|cos|def|div|high|low|mul|sin|strcat|strcmp|strin|strlen|strlwr|strsub|strupr|tan)$/i

class SymbolDescriptor {
  constructor(public location: vscode.Location, public isExported: boolean, public kind: vscode.SymbolKind, public documentation?: string) { }
}

class FileTable {
  includedFiles: string[]
  symbols: { [name: string]: SymbolDescriptor }
  
  constructor() {
    this.includedFiles = [];
    this.symbols = {};
  }
}

enum SearchMode {
  globals,
  includes,
  parents
}

export class ASMSymbolDocumenter {
  files: { [name: string]: FileTable };
  constructor() {
    this.files = {};
    
    vscode.workspace.findFiles("**/*.{z80,inc,asm}", null, undefined).then((files) => {
      files.forEach((fileURI) => {
        vscode.workspace.openTextDocument(fileURI).then((document) => {
          this._document(document);
        });
      });
    });
    
    vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      this._document(event.document);
    });
    
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.{z80,inc,asm}");
    watcher.onDidChange((uri) => {
      vscode.workspace.openTextDocument(uri).then((document) => {
        this._document(document);
      });
    });
    
    watcher.onDidCreate((uri) => {
      vscode.workspace.openTextDocument(uri).then((document) => {
        this._document(document);
      });
    });
    
    watcher.onDidDelete((uri) => {
      delete this.files[uri.fsPath];
    });
  }
  
  /**
   * Seeks files that include `fsPath` for symbols.
   * @param fsPath The path of the file to seek above.
   * @param output The collection of discovered symbols.
   * @param searched Paths of files that have already been searched.
   */
  private _seekSymbolsUp(fsPath: string, output: { [name: string]: SymbolDescriptor }, searched: string[]) {
    for (const filename in this.files) {
      if (this.files.hasOwnProperty(filename)) {
        if (searched.indexOf(filename) != -1) {
          continue;
        }
        
        const table = this.files[filename];
        if (table == undefined) {
          return;
        }
        
        if (table.includedFiles.indexOf(fsPath) != -1) {
          this._seekSymbols(filename, output, searched, SearchMode.includes);
          this._seekSymbols(filename, output, searched, SearchMode.parents);
        }
      }
    }
  }
  
  /**
   * Seeks symbols for use by Intellisense in the file at `fsPath`.
   * @param fsPath The path of the file to seek in.
   * @param output The collection of discovered symbols.
   * @param searched Paths of files that have already been searched.
   * @param mode What sort of files and symbols to seek through.
   */
  private _seekSymbols(fsPath: string, output: { [name: string]: SymbolDescriptor }, searched: string[], mode: SearchMode) {
    const table = this.files[fsPath];
    
    if (table == undefined) {
      return;
    }
    
    searched.push(fsPath);
        
    for (const name in table.symbols) {
      if (table.symbols.hasOwnProperty(name)) {
        const symbol = table.symbols[name];
        if (!(name in output)) {
          if ((mode != SearchMode.globals) || symbol.isExported) {
            output[name] = symbol;
          }
        }
      }
    }
    
    if (mode == SearchMode.includes) {
      table.includedFiles.forEach((includeFilename) => {
        if (searched.indexOf(includeFilename) == -1) {
          searched.push(includeFilename);
          
          this._seekSymbols(includeFilename, output, searched, SearchMode.includes);
        }
      });
    }
    
    if (mode == SearchMode.parents) {
      this._seekSymbolsUp(fsPath, output, searched);
    }
  }
  
  /**
   * Returns a set of symbols possibly within scope of `context`.
   * @param context The document to find symbols for.
   */
  symbols(context: vscode.TextDocument): {[name: string] : SymbolDescriptor} {
    const output: { [name: string]: SymbolDescriptor } = {};
    
    // First, find all exported symbols in the entire workspace
    for (const filename in this.files) {
      if (this.files.hasOwnProperty(filename)) {
        this._seekSymbols(filename, output, [], SearchMode.globals);
      }
    }
    
    // Next, grab all symbols for this file and included files
    const searchedIncludes: string[] = []
    this._seekSymbols(context.uri.fsPath, output, searchedIncludes, SearchMode.includes);
    
    // Finally, grab files that include this file
    this._seekSymbols(context.uri.fsPath, output, searchedIncludes, SearchMode.parents);
    
    return output;
  }
  
  /**
   * Returns a `SymbolDescriptor` for the symbol having `name`, or `undefined`
   * if no such symbol exists.
   * @param name The name of the symbol.
   * @param searchContext The document to find the symbol in.
   */
  symbol(name: string, searchContext: vscode.TextDocument): SymbolDescriptor | undefined {
    return this.symbols(searchContext)[name];
  }
  
  private _document(document: vscode.TextDocument) {
    const table = new FileTable();
    this.files[document.uri.fsPath] = table;
    
    let commentBuffer: String[] = [];
    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
      const line = document.lineAt(lineNumber);
      
      const commentLineMatch = commentLineRegex.exec(line.text);
      
      if (commentLineMatch) {
        const baseLine = commentLineMatch[1].trim();
        
        if (spacerRegex.test(baseLine)) {
          continue;
        }
        
        commentBuffer.push(baseLine);
      } else {
        const includeLineMatch = includeLineRegex.exec(line.text);
        const labelMatch = labelDefinitionRegex.exec(line.text);
        
        if (includeLineMatch) {
          const filename = includeLineMatch[1];
          const documentDirname = path.dirname(document.uri.fsPath);
          const includeName = path.join(documentDirname, filename);
          table.includedFiles.push(includeName);
        } else if (labelMatch) {
          const declaration = labelMatch[1];
          if (instructionRegex.test(declaration)) {
            continue;
          }
          
          if (keywordRegex.test(declaration)) {
            continue;
          }
          
          const isFunction = declaration.indexOf(":") != -1;
          
          const name = declaration.replace(/:+/, "");
          const location = new vscode.Location(document.uri, line.range.start);
          let isExported = false;
          let documentation: string | undefined = undefined;
          
          if (declaration.indexOf("::") != -1) {
            isExported = true;
          }
          
          const endCommentMatch = endCommentRegex.exec(line.text);
          if (endCommentMatch) {
            commentBuffer.push(endCommentMatch[1].trim());
          }
          
          if (defineExpressionRegex.test(line.text)) {
            const trimmed = line.text.replace(/[\s]+/, " ");
            const withoutComment = trimmed.replace(/;.*$/, "");
            commentBuffer.splice(0, 0, `\`${withoutComment}\`\n`);
          }
          
          if (commentBuffer.length > 0) {
            documentation = commentBuffer.join("\n");
          }
          
          table.symbols[name] = new SymbolDescriptor(location, isExported, isFunction ? vscode.SymbolKind.Function : vscode.SymbolKind.Constant, documentation);
        }
        
        commentBuffer = [];
      }
    }
  }
}
