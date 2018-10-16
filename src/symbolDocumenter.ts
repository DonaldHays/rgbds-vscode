'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { syntaxInfo } from './syntaxInfo';

const commentLineRegex = /^;\s*(.*)$/
const endCommentRegex = /^[^;]+;\s*(.*)$/
const includeLineRegex = /^include[\s]+"([^"]+)".*$/i
const spacerRegex = /^\s*(.)\1{3,}\s*$/
const labelDefinitionRegex = /^([a-zA-Z_][a-zA-Z_0-9]*[:]{0,2}).*$/
const defineExpressionRegex = /^[\s]*[a-zA-Z_][a-zA-Z_0-9]*[\s]+(equ|equs|set)[\s]+.*$/i
const instructionRegex = new RegExp(`^(${syntaxInfo.instructions.join("|")})$`, "i");
const keywordRegex = new RegExp(`^(${syntaxInfo.preprocessorKeywords.join("|")})$`, "i");

class SymbolDescriptor {
  constructor(public location: vscode.Location, public isExported: boolean, public kind: vscode.SymbolKind, public documentation?: string) { }
}

class FileTable {
  includedFiles: string[]
  fsDir: string
  fsPath: string
  symbols: { [name: string]: SymbolDescriptor }
  
  constructor(fsPath: string) {
    this.includedFiles = [];
    this.fsDir = path.dirname(fsPath);
    this.fsPath = fsPath;
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
  
  private _resolveFilename(filename: string, fsRelativeDir: string): string {
    // Try just sticking the filename onto the directory.
    let simpleJoin = path.resolve(fsRelativeDir, filename);
    if (fs.existsSync(simpleJoin)) {
      return simpleJoin;
    }
    
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
      
      // Test for existence of the filename glued onto the include path.
      var joined = path.resolve(includePath, filename);
      if (fs.existsSync(joined)) {
        return joined;
      }
    }
    
    // Nothing found, return the empty string.
    return "";
  }
  
  /**
   * Seeks files that include `fsPath` for symbols.
   * @param fsPath The file to seek above.
   * @param fsRelativeDir The directory of the originating context.
   * @param output The collection of discovered symbols.
   * @param searched Paths of files that have already been searched.
   */
  private _seekSymbolsUp(fsPath: string, output: { [name: string]: SymbolDescriptor }, searched: string[]) {
    for (const globalFilePath in this.files) {
      if (this.files.hasOwnProperty(globalFilePath)) {
        if (searched.indexOf(globalFilePath) != -1) {
          continue;
        }
        
        const table = this.files[globalFilePath];
        if (table == undefined) {
          return;
        }
        
        const globalName = path.basename(globalFilePath);
        const globalFileDirname = path.dirname(globalFilePath);
        for (var i = 0; i < table.includedFiles.length; i++) {
          const resolvedIncluded = this._resolveFilename(table.includedFiles[i], globalFileDirname);
          if (resolvedIncluded == fsPath) {
            this._seekSymbols(globalName, globalFileDirname, output, searched, SearchMode.includes);
            this._seekSymbols(globalName, globalFileDirname, output, searched, SearchMode.parents);
            break;
          }
        }
      }
    }
  }
  
  /**
   * Seeks symbols for use by Intellisense in `filename`.
   * @param filename The name of the file to seek in.
   * @param fsRelativeDir The directory of the originating context.
   * @param output The collection of discovered symbols.
   * @param searched Paths of files that have already been searched.
   * @param mode What sort of files and symbols to seek through.
   */
  private _seekSymbols(filename: string, fsRelativeDir: string, output: { [name: string]: SymbolDescriptor }, searched: string[], mode: SearchMode) {
    const fsPath = this._resolveFilename(filename, fsRelativeDir);
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
        const includedFSPath = this._resolveFilename(includeFilename, fsRelativeDir);
        if (searched.indexOf(includedFSPath) == -1) {
          searched.push(includedFSPath);
          
          this._seekSymbols(includeFilename, fsRelativeDir, output, searched, SearchMode.includes);
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
        const globalFileBasename = path.basename(filename);
        const globalFileDirname = path.dirname(filename);
        
        this._seekSymbols(globalFileBasename, globalFileDirname, output, [], SearchMode.globals);
      }
    }
    
    const contextFileBasename = path.basename(context.uri.fsPath);
    const contextFileDirname = path.dirname(context.uri.fsPath);
    
    // Next, grab all symbols for this file and included files
    const searchedIncludes: string[] = []
    this._seekSymbols(contextFileBasename, contextFileDirname, output, searchedIncludes, SearchMode.includes);
    
    // Finally, grab files that include this file
    this._seekSymbols(contextFileBasename, contextFileDirname, output, searchedIncludes, SearchMode.parents);
    
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
  
  private _pushDocumentationLine(line: String, buffer: String[]) {
    if (line.indexOf("@") == 0 && buffer.length > 0) {
      buffer.push("");
    }
    
    buffer.push(line);
  }
  
  private _document(document: vscode.TextDocument) {
    const table = new FileTable(document.uri.fsPath);
    this.files[document.uri.fsPath] = table;
    
    let commentBuffer: String[] = [];
    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
      const line = document.lineAt(lineNumber);
      
      const commentLineMatch = commentLineRegex.exec(line.text);
      
      if (commentLineMatch) {
        const baseLine = commentLineMatch[1];
        
        if (spacerRegex.test(baseLine)) {
          continue;
        }
        
        this._pushDocumentationLine(baseLine, commentBuffer);
      } else {
        const includeLineMatch = includeLineRegex.exec(line.text);
        const labelMatch = labelDefinitionRegex.exec(line.text);
        
        if (includeLineMatch) {
          const filename = includeLineMatch[1];
          table.includedFiles.push(filename);
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
            this._pushDocumentationLine(endCommentMatch[1], commentBuffer);
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
