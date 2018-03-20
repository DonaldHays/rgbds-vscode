'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

const commentLineRegex = /^;(.*)$/
const endCommentRegex = /^[^;]+;(.*)$/
const includeLineRegex = /^include[\s]+"([^"]+)".*$/i
const spacerRegex = /^(.)\1{3,}$/
const labelDefinitionRegex = /^([a-zA-Z_][a-zA-Z_0-9]*[:]{0,2}).*$/
const instructionRegex = /^(adc|add|and|bit|call|ccf|cp|cpl|daa|dec|di|ei|halt|inc|jp|jr|ld|nop|or|pop|push|res|ret|reti|rl|rla|rlc|rlca|rr|rra|rrc|rrca|rst|sbc|scf|set|sla|sra|srl|stop|sub|swap|xor)$/i
const keywordRegex = /^(section|pops|pushs|equ|set|equs|macro|endm|shift|rsset|rsreset|rb|rw|rl|export|global|purge|db|dw|dl|ds|incbin|include|union|nextu|endu|printt|printv|printi|printf|repeat|endr|fail|warn|if|elif|else|endc|opt|popo|pusho)$/i

class SymbolDescriptor {
  constructor(public location: vscode.Location, public isExported: boolean, public documentation?: string) { }
}

class FileTable {
  includedFiles: string[]
  symbols: { [name: string]: SymbolDescriptor }
  
  constructor() {
    this.includedFiles = [];
    this.symbols = {};
  }
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
  
  private _seekSymbols(fsPath: string, output: { [name: string]: SymbolDescriptor }, searched: string[], onlyExported: boolean, searchIncludes: boolean) {
    const table = this.files[fsPath];
    
    if (table == undefined) {
      return;
    }
        
    for (const name in table.symbols) {
      if (table.symbols.hasOwnProperty(name)) {
        const symbol = table.symbols[name];
        if (!(name in output)) {
          if ((onlyExported == false) || symbol.isExported) {
            output[name] = symbol;
          }
        }
      }
    }
    
    if (searchIncludes) {
      table.includedFiles.forEach((includeFilename) => {
        if (searched.indexOf(includeFilename) == -1) {
          searched.push(includeFilename);
          
          this._seekSymbols(includeFilename, output, searched, onlyExported, searchIncludes);
        }
      });
    }
  }
  
  symbols(context: vscode.TextDocument): {[name: string] : SymbolDescriptor} {
    const output: { [name: string]: SymbolDescriptor } = {};
    
    // First, find all exported symbols in the entire workspace
    for (const filename in this.files) {
      if (this.files.hasOwnProperty(filename)) {
        this._seekSymbols(filename, output, [], true, false);
      }
    }
    
    // Next, grab all symbols for this file and included files
    const searchedIncludes: string[] = []
    this._seekSymbols(context.uri.fsPath, output, searchedIncludes, false, true);
    
    return output;
  }
  
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
          
          if (commentBuffer.length > 0) {
            documentation = commentBuffer.join("\n");
          }
          
          table.symbols[name] = new SymbolDescriptor(location, isExported, documentation);
        }
        
        commentBuffer = [];
      }
    }
  }
}
