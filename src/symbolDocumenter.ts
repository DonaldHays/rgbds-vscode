'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { syntaxInfo } from './syntaxInfo';

const commentLineRegex = /^\s*;\s*(.*)$/
const endCommentRegex = /^[^;]+;\s*(.*)$/

const singleLineBlockCommentRegex = /^.*\/\*+\s*(.*?)\s*\*\/.*$/
const blockCommentBeginRegex = /^.*\/\*+\s*(.*?)\s*$/
const javaDocCommentBeginRegex = /^.*\/\*\*\s*(.*?)\s*$/
const javaDocLinePrefixRegex = /^\s*\*?\s*(.*?)\s*$/
const blockCommentEndRegex = /^(.*?)\s*\*\/.*$/

const includeLineRegex = /^include[\s]+"([^"]+)".*$/i
const spacerRegex = /^\s*(.)\1{3,}\s*$/
const labelDefinitionRegex = /^\s*((?:[A-Z_][\w#@]*)?(?:(?:\.[\w#@]*:{0,2})|(?:[A-Z_][\w#@]*:{1,2})))/i
const defineExpressionRegex = /^\s*(?:def\s*)?([A-Z_][\w#@]*)\s+(?:(?:equ|equs|set|=)\s+.+|(?:rb|rw|rl)(?:\s+.*)?)$/i
const instructionRegex = new RegExp(`^(${syntaxInfo.instructions.join("|")})\\b`, "i");
const keywordRegex = new RegExp(`^(${syntaxInfo.preprocessorKeywords.join("|")})\\b`, "i");
const macroDefinitionRegex = /^\s*macro[\s]+([A-Z_][\w#@]*).*$/i
const exportDefinitionRegex = /^\s*export[\s]+([A-Z_][\w#@]*).*$/i

class ScopeDescriptor {
  constructor(public start: vscode.Position, public end?: vscode.Position) { }
}

class SymbolDescriptor {
  constructor(public location: vscode.Location, public isExported: boolean, public isLocal: boolean, public kind: vscode.SymbolKind, public scope?: ScopeDescriptor, public documentation?: string) { }
}

class IncludeDescriptor {
  constructor(
    public range: vscode.Range,
    public name: string,
    public fsPath: string,
  ) {
  }
}

class FileTable {
  includedFiles: IncludeDescriptor[]
  fsDir: string
  fsPath: string
  symbols: { [name: string]: SymbolDescriptor }
  scopes: ScopeDescriptor[]

  constructor(fsPath: string) {
    this.includedFiles = [];
    this.fsDir = path.dirname(fsPath);
    this.fsPath = fsPath;
    this.symbols = {};
    this.scopes = [];
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
          const resolvedIncluded = this._resolveFilename(table.includedFiles[i].name, globalFileDirname);
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
      table.includedFiles.forEach((includeDescriptor) => {
        const includedFSPath = this._resolveFilename(includeDescriptor.name, fsRelativeDir);
        if (searched.indexOf(includedFSPath) == -1) {
          searched.push(includedFSPath);

          this._seekSymbols(includeDescriptor.name, fsRelativeDir, output, searched, SearchMode.includes);
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
  symbols(context: vscode.TextDocument): { [name: string]: SymbolDescriptor } {
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
    if ((line.indexOf("@") == 0 || vscode.workspace.getConfiguration().get("rgbdsz80.includeAllDocCommentNewlines")) && buffer.length > 0) {
      let lastLine = buffer[buffer.length - 1];
      if (lastLine.lastIndexOf("  ") != lastLine.length - 2) {
        buffer[buffer.length - 1] = lastLine + "  ";
      }
    }

    buffer.push(line);
  }

  private _document(document: vscode.TextDocument) {
    const table = new FileTable(document.uri.fsPath);
    this.files[document.uri.fsPath] = table;

    let currentScope: ScopeDescriptor | undefined = undefined;

    let commentBuffer: String[] = [];
    let isInBlockComment = false;
    let isInJavaDocComment = false;

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
        const macroMatch = macroDefinitionRegex.exec(line.text);
        const exportMatch = exportDefinitionRegex.exec(line.text);
        const defineMatch = defineExpressionRegex.exec(line.text);
        const singleLineBlockCommentMatch = singleLineBlockCommentRegex.exec(line.text);
        const blockCommentBeginMatch = blockCommentBeginRegex.exec(line.text);
        const blockCommentEndMatch = blockCommentEndRegex.exec(line.text);

        let hadBlockComment = false;

        if (singleLineBlockCommentMatch) {
          this._pushDocumentationLine(singleLineBlockCommentMatch[1], commentBuffer);
          hadBlockComment = true;
        } else if (blockCommentBeginMatch) {
          if (spacerRegex.test(blockCommentBeginMatch[1]) == false) {
            this._pushDocumentationLine(blockCommentBeginMatch[1], commentBuffer);
          }
          isInBlockComment = true;
          isInJavaDocComment = javaDocCommentBeginRegex.test(line.text);
        } else if (blockCommentEndMatch) {
          if (spacerRegex.test(blockCommentEndMatch[1]) == false) {
            this._pushDocumentationLine(blockCommentEndMatch[1], commentBuffer);
          }
          isInBlockComment = false;
          hadBlockComment = true;
        } else if (isInBlockComment) {
          let text = line.text;

          if (isInJavaDocComment) {
            let javaDocPrefix = text.match(javaDocLinePrefixRegex);
            if (javaDocPrefix) {
              text = javaDocPrefix[1];
            }
          }

          if (spacerRegex.test(text) == false) {
            this._pushDocumentationLine(text, commentBuffer);
          }
        }

        const declarationMatch = macroMatch || exportMatch || defineMatch || labelMatch;
        if (includeLineMatch) {
          const filename = includeLineMatch[1];
          const startCharacter = line.text.indexOf(`${filename}`);
          const startPosition = new vscode.Position(line.lineNumber, startCharacter);
          const endPosition = new vscode.Position(line.lineNumber, startCharacter + filename.length);
          table.includedFiles.push(new IncludeDescriptor(
            new vscode.Range(startPosition, endPosition),
            filename,
            this._resolveFilename(filename, document.uri.fsPath),
          ));
        } else if (declarationMatch) {
          const declaration = declarationMatch[1];
          if (instructionRegex.test(declaration)) {
            continue;
          }

          if (keywordRegex.test(declaration)) {
            continue;
          }

          if (declaration.indexOf(".") == -1) {
            if (currentScope) {
              currentScope.end = document.positionAt(document.offsetAt(line.range.start) - 1);
            }

            currentScope = new ScopeDescriptor(line.range.start);
            table.scopes.push(currentScope);
          }

          const isFunction = !!exportMatch || declaration.indexOf(":") != -1;

          const name = !exportMatch ? declaration.replace(/:+/, "") : declaration.replace(/export\s+/i, "");
          const location = new vscode.Location(document.uri, line.range.start);
          const isExported = !!exportMatch || declaration.indexOf("::") != -1;
          const isLocal = declaration.indexOf(".") != -1;
          let documentation: string | undefined = undefined;

          const endCommentMatch = endCommentRegex.exec(line.text);
          if (endCommentMatch) {
            this._pushDocumentationLine(endCommentMatch[1], commentBuffer);
          }

          // If all comment lines begin with a common prefix (like "--" in
          // hardware.inc), trim the prefix.
          if (commentBuffer.length > 1) {
            let sorted = commentBuffer.concat().sort();
            let first = sorted[0];
            let final = sorted[sorted.length - 1];
            let commonLength = 0;
            while (commonLength < first.length && commonLength < final.length && first.charAt(commonLength) == final.charAt(commonLength)) {
              commonLength++;
            }

            if (commonLength > 0) {
              commentBuffer = commentBuffer.map((str) => { return str.substring(commonLength); });
            }
          }

          if (defineExpressionRegex.test(line.text)) {
            const trimmed = line.text.replace(/[\s]+/g, " ");
            const withoutComment = trimmed.replace(/;.*$/, "");
            commentBuffer.splice(0, 0, `\`${withoutComment}\`\n`);
          }

          if (commentBuffer.length > 0) {
            documentation = commentBuffer.join("\n");
          }

          if (name in table.symbols) {
            if (exportMatch) {
              table.symbols[name].isExported = isExported;
            } else {
              table.symbols[name] = new SymbolDescriptor(location, table.symbols[name].isExported, isLocal, isFunction ? vscode.SymbolKind.Function : vscode.SymbolKind.Constant, currentScope, documentation);
            }
          } else {
            table.symbols[name] = new SymbolDescriptor(location, isExported, isLocal, isFunction ? vscode.SymbolKind.Function : vscode.SymbolKind.Constant, currentScope, documentation);
          }
        }

        if (hadBlockComment == false && isInBlockComment == false) {
          commentBuffer = [];
        }
      }
    }

    if (currentScope) {
      currentScope.end = document.lineAt(document.lineCount - 1).rangeIncludingLineBreak.end;
    }
  }
}
