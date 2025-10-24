import * as vscode from 'vscode';
import { extname } from 'path';

type ASMDocumentData = {
  readonly uri: vscode.Uri,
  readonly path: string,
  readonly extension: string
};

export class ASMDocumentWatcher {
  private filesByPath = new Map<string, ASMDocumentData>();

  /**
   * The current set of tracked assembly and include files in the workspace.
   */
  files = new Set<ASMDocumentData>();

  private didAddEmitter = new vscode.EventEmitter<ASMDocumentData>();
  private didChangeEmitter = new vscode.EventEmitter<ASMDocumentData>();
  private didRemoveEmitter = new vscode.EventEmitter<ASMDocumentData>();

  get onDidAdd(): vscode.Event<ASMDocumentData> {
    return this.didAddEmitter.event;
  }

  get onDidChange(): vscode.Event<ASMDocumentData> {
    return this.didChangeEmitter.event;
  }

  get onDidRemove(): vscode.Event<ASMDocumentData> {
    return this.didRemoveEmitter.event;
  }

  constructor() {
    const glob = "**/*.{z80,inc,asm,s,sm83}";

    // Build the initial collection of files.
    vscode.workspace.findFiles(glob, null, undefined).then((uris) => {
      for (const uri of uris) {
        const file = this.getFile(uri);
        this.filesByPath.set(file.path, file);
        this.files.add(file);
        this.didAddEmitter.fire(file);
      }
    });

    // Use a file system watcher to observe changes in the workspace.
    const watcher = vscode.workspace.createFileSystemWatcher(glob);

    watcher.onDidChange((uri) => {
      this.didChangeEmitter.fire(this.getFile(uri));
    });

    watcher.onDidCreate((uri) => {
      const file = this.getFile(uri);
      this.filesByPath.set(file.path, file);
      this.files.add(file);
      this.didAddEmitter.fire(file);
    });

    watcher.onDidDelete((uri) => {
      const file = this.getFile(uri);
      this.filesByPath.delete(file.path);
      this.files.delete(file);
      this.didRemoveEmitter.fire(file);
    });
  }

  /**
   * Returns an `ASMDocumentData` for the given `uri`.
   * 
   * If there's already a known instance for the `Uri`'s `fsPath`, that instance
   * will be returned.
   */
  private getFile(uri: vscode.Uri): ASMDocumentData {
    const path = uri.fsPath;
    const existing = this.filesByPath.get(path);
    if (existing) {
      return existing;
    }

    const extension = extname(path).toLowerCase();
    return { uri, path, extension };
  }

  /**
   * Returns the set of currently known files that have extensions found within
   * `extensions`.
   */
  public getFilesWithExtensions(extensions: Set<string>): Set<ASMDocumentData> {
    const output = new Set<ASMDocumentData>();
    for (const file of this.files) {
      if (extensions.has(file.extension)) {
        output.add(file);
      }
    }
    return output;
  }
}
