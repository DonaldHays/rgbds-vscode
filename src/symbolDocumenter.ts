'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { syntaxInfo } from './syntaxInfo';
import { ASMConfiguration } from './configuration';
import { ASMDocumentWatcher } from './documentWatcher';

const commentLineRegex = /^\s*;\s*(.*)$/
const endCommentRegex = /^[^;]+;\s*(.*)$/

const singleLineBlockCommentRegex = /^.*\/\*+\s*(.*?)\s*\*\/.*$/
const blockCommentBeginRegex = /^.*\/\*+\s*(.*?)\s*$/
const javaDocCommentBeginRegex = /^.*\/\*\*\s*(.*?)\s*$/
const javaDocLinePrefixRegex = /^\s*\*?\s*(.*?)\s*$/
const blockCommentEndRegex = /^(.*?)\s*\*\/.*$/

const includeLineRegex = /^\s*include[\s]+"([^"]+)".*$/i
const spacerRegex = /^\s*(.)\1{3,}\s*$/
const labelDefinitionRegex = /^\s*(#?)((?:(?:[a-z_][\w#$@]*)?\.[\w#$@]+:{0,2})|(?:[a-z_][\w#$@]*:{1,2}))/i
const defineExpressionRegex = /^\s*(?:def\s*)?(#?)([a-z_][\w#$@]*)\s+(?:(?:equ|equs|=)\s+.+|(?:rb|rw|rl)(?:\s+.*)?)$/i
const instructionRegex = new RegExp(`^(${syntaxInfo.instructions.join("|")})(?![\\w#$@])`, "i");
const keywordRegex = new RegExp(`^(${syntaxInfo.preprocessorKeywords.join("|")})(?![\\w#$@])`, "i");
const macroDefinitionRegex = /^\s*macro[\s]+(#?)([a-z_][\w#$@]*).*$/i
const exportDefinitionRegex = /^\s*export[\s]+(#?)([a-z_][\w#$@]*).*$/i

class ScopeDescriptor {
  constructor(public start: vscode.Position, public end?: vscode.Position) { }
}

class SymbolDescriptor {
  constructor(
    public location: vscode.Location,
    public isExported: boolean,
    public isLocal: boolean,
    public kind: vscode.SymbolKind,
    public isReservedWord: boolean,
    public scope?: ScopeDescriptor,
    public documentation?: string
  ) { }
}

type IncludeDescriptor = {
  /**
   * The range of the file string in the include directive.
   * 
   * This is used for providing document links.
   */
  readonly range: vscode.Range;

  /** The file's path as written in the include directive. */
  readonly relativePath: string;

  /** The file's absolute path, if resolved to a real file. */
  readonly absolutePath?: string;
};

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

type FileResolution = {
  readonly absolutePath?: string;
  readonly diagnostic?: vscode.Diagnostic;
};

export class ASMSymbolDocumenter {
  files: { [name: string]: FileTable };
  constructor(
    watcher: ASMDocumentWatcher,
    private config: ASMConfiguration,
    private diagnostics: vscode.DiagnosticCollection,
  ) {
    this.files = {};

    // Redocument everything if the include paths configuration changes.
    vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration("rgbdsz80.includePath")) {
        for (const file of watcher.files) {
          vscode.workspace.openTextDocument(file.uri).then((document) => {
            this._document(document);
          });
        }
      }
    });

    // Redocument a file whenever it's edited.
    vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      this._document(event.document);
    });

    // Document a file when it's added.
    watcher.onDidAdd((file) => {
      vscode.workspace.openTextDocument(file.uri).then((document) => {
        this._document(document);
      });
    });

    // Redocument a file when it changes on disk.
    watcher.onDidChange((file) => {
      vscode.workspace.openTextDocument(file.uri).then((document) => {
        this._document(document);
      });
    });

    // Remove a file's documentation when it's removed.
    watcher.onDidRemove((file) => {
      delete this.files[file.path];
    });
  }

  /**
   * Returns the absolute file path of `filename`, accounting for configured
   * include paths.
   * 
   * @param filename a file path relative to the workspace root or a configured
   *   include path.
   */
  private _resolvedFilename(
    range: vscode.Range, filename: string, localDir: string,
  ): FileResolution {
    const workspaceRoot = vscode.workspace.workspaceFolders ?
      vscode.workspace.workspaceFolders[0].uri.fsPath :
      undefined;

    // Search relative to workspace root first
    if (workspaceRoot) {
      const resolved = path.resolve(workspaceRoot, filename);
      if (fs.existsSync(resolved)) {
        if (fs.statSync(resolved).isDirectory()) {
          return {};
        } else {
          return { absolutePath: resolved };
        }
      }
    }

    // Search configured include paths, in the order they were declared in
    for (let includePath of this.config.includePaths) {
      // If the path is relative, make it absolute starting from workspace root.
      if (workspaceRoot && !path.isAbsolute(includePath)) {
        includePath = path.resolve(workspaceRoot, includePath);
      }

      // Test for existence of the filename glued onto the include path.
      const resolved = path.resolve(includePath, filename);
      if (fs.existsSync(resolved)) {
        if (fs.statSync(resolved).isDirectory()) {
          return {};
        } else {
          return { absolutePath: resolved };
        }
      }
    }

    // Cover previous behavior by finding files relative to current file, but
    // warn if a file was found that way
    const localPath = path.resolve(localDir, filename);
    if (fs.existsSync(localPath) && !fs.statSync(localPath).isDirectory()) {
      const reportDir = (workspaceRoot !== undefined) ?
        path.relative(workspaceRoot, localDir) :
        "its directory";

      return {
        absolutePath: localPath,
        diagnostic: new vscode.Diagnostic(
          range,
          `File \"${filename}\" was found relative to this document's ` +
          `directory, which is not registered as an include path. Add ` +
          `\"${reportDir}\" to your workspace's "rgbdsz80.includePath" ` +
          `setting.`,
          vscode.DiagnosticSeverity.Warning
        )
      }
    }

    // The file could not be found, warn about it
    return {
      diagnostic: new vscode.Diagnostic(
        range,
        `Could not find \"${filename}\". Search paths can be added to your ` +
        `workspace's "rgbdsz80.includePath" setting.`,
        vscode.DiagnosticSeverity.Warning
      )
    };
  }

  /**
   * Seeks files that include `absolutePath` for symbols.
   * @param absolutePath The file to seek above.
   * @param output The collection of discovered symbols.
   * @param searched Paths of files that have already been searched.
   */
  private _seekSymbolsFromParents(
    absolutePath: string,
    output: Map<string, SymbolDescriptor>,
    searched: Set<string>
  ) {
    // Search every file as a potential parent.
    for (const parentPath in this.files) {
      if (this.files.hasOwnProperty(parentPath)) {
        const parentTable = this.files[parentPath];

        // Skip this file if it's already been considered.
        if (searched.has(parentPath)) {
          continue;
        }

        for (const includedFile of parentTable.includedFiles) {
          if (includedFile.absolutePath == absolutePath) {
            this._seekSymbols(parentPath, output, searched, SearchMode.includes);
            this._seekSymbols(parentPath, output, searched, SearchMode.parents);
            break;
          }
        }
      }
    }
  }

  /**
   * Seeks symbols for use by IntelliSense in `absolutePath`.
   * @param absolutePath The name of the file to seek in.
   * @param output The collection of discovered symbols.
   * @param searched Paths of files that have already been searched.
   * @param mode What sort of files and symbols to seek through.
   */
  private _seekSymbols(
    absolutePath: string,
    output: Map<string, SymbolDescriptor>,
    searched: Set<string>,
    mode: SearchMode
  ) {
    const table = this.files[absolutePath];

    if (table == undefined) {
      return;
    }

    searched.add(absolutePath);

    for (const name in table.symbols) {
      if (table.symbols.hasOwnProperty(name)) {
        const symbol = table.symbols[name];
        if (!output.has(name)) {
          if ((mode != SearchMode.globals) || symbol.isExported) {
            output.set(name, symbol);
          }
        }
      }
    }

    if (mode == SearchMode.includes) {
      for (const includeDescriptor of table.includedFiles) {
        const includedAbsolutePath = includeDescriptor.absolutePath;
        if (includedAbsolutePath) {
          if (!searched.has(includedAbsolutePath)) {
            searched.add(includedAbsolutePath);

            this._seekSymbols(
              includedAbsolutePath, output, searched, SearchMode.includes
            );
          }
        }
      }
    }

    if (mode == SearchMode.parents) {
      this._seekSymbolsFromParents(absolutePath, output, searched);
    }
  }

  /**
   * Returns a set of symbols possibly within scope of `context`.
   * @param context The document to find symbols for.
   */
  symbols(context: vscode.TextDocument): Map<string, SymbolDescriptor> {
    const output = new Map<string, SymbolDescriptor>();

    // First, find all exported symbols in the entire workspace
    for (const filename in this.files) {
      if (this.files.hasOwnProperty(filename)) {
        this._seekSymbols(filename, output, new Set(), SearchMode.globals);
      }
    }

    const absolutePath = context.uri.fsPath;

    // Next, grab all symbols for this file and included files
    const searched = new Set<string>();
    this._seekSymbols(absolutePath, output, searched, SearchMode.includes);

    // Finally, grab files that include this file
    this._seekSymbols(absolutePath, output, searched, SearchMode.parents);

    return output;
  }

  /**
   * Returns a `SymbolDescriptor` for the symbol having `name`, or `undefined`
   * if no such symbol exists.
   * @param name The name of the symbol.
   * @param searchContext The document to find the symbol in.
   */
  symbol(name: string, searchContext: vscode.TextDocument): SymbolDescriptor | undefined {
    return this.symbols(searchContext).get(name);
  }

  private _pushDocumentationLine(line: String, buffer: String[]) {
    if ((line.indexOf("@") == 0 || this.config.includeAllDocCommentNewlines) && buffer.length > 0) {
      let lastLine = buffer[buffer.length - 1];
      if (lastLine.lastIndexOf("  ") != lastLine.length - 2) {
        buffer[buffer.length - 1] = lastLine + "  ";
      }
    }

    buffer.push(line);
  }

  private _document(document: vscode.TextDocument) {
    const table = new FileTable(document.uri.fsPath);
    const diagnostics: vscode.Diagnostic[] = [];
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
          const relativePath = includeLineMatch[1];
          const startCharacter = line.text.indexOf(`${relativePath}`);
          const startPosition = new vscode.Position(
            line.lineNumber, startCharacter
          );
          const endPosition = new vscode.Position(
            line.lineNumber, startCharacter + relativePath.length
          );
          const range = new vscode.Range(startPosition, endPosition);
          const { absolutePath, diagnostic } = this._resolvedFilename(
            range, relativePath, path.dirname(document.uri.fsPath)
          );

          table.includedFiles.push({ range, relativePath, absolutePath });

          if (diagnostic) {
            diagnostics.push(diagnostic);
          }
        } else if (declarationMatch) {
          const isRaw = declarationMatch[1] == "#";
          const declaration = declarationMatch[2];
          let isReservedWord = false;

          if (!isRaw) {
            if (instructionRegex.test(declaration)) {
              continue;
            }

            if (keywordRegex.test(declaration)) {
              continue;
            }
          } else {
            isReservedWord = instructionRegex.test(declaration);
            isReservedWord ||= keywordRegex.test(declaration);
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
              table.symbols[name] = new SymbolDescriptor(
                location,
                table.symbols[name].isExported,
                isLocal,
                isFunction ? vscode.SymbolKind.Function : vscode.SymbolKind.Constant,
                isReservedWord,
                currentScope,
                documentation
              );
            }
          } else {
            table.symbols[name] = new SymbolDescriptor(
              location,
              isExported,
              isLocal,
              isFunction ? vscode.SymbolKind.Function : vscode.SymbolKind.Constant,
              isReservedWord,
              currentScope,
              documentation
            );
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

    this.diagnostics.set(document.uri, diagnostics);
  }
}
