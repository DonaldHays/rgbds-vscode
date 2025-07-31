"use strict";

import * as vscode from 'vscode';

const kCompleteInstructions = "rgbdsz80.showInstructionCompletionSuggestions";
const kCapitalization = "rgbdsz80.formatting.capitalization";
const kIncludePath = "rgbdsz80.includePath";
const kAllNewlines = "rgbdsz80.includeAllDocCommentNewlines";

export class ASMConfiguration {
  private get config() {
    return vscode.workspace.getConfiguration();
  }

  /**
   * Returns whether intellisense autocomplete suggestions should include Game
   * Boy opcode instructions.
   */
  get showInstructionCompletionSuggestions(): boolean {
    return this.config.get(kCompleteInstructions) ?? false;
  }

  /**
   * Returns the collection of configured capitalization formatting rules.
   */
  get capitalizationRules(): { [key: string]: string | null } {
    return this.config.get(kCapitalization) ?? {};
  }

  /**
   * Returns the list of include paths to search for `include` directives.
   */
  get includePaths(): string[] {
    const paths: string | string[] = this.config.get(kIncludePath) ?? [];
    if (typeof paths === "string") {
      return [paths];
    }

    return paths;
  }

  /**
   * Returns whether doc comment rendering should reflect all newlines.
   */
  get includeAllDocCommentNewlines(): boolean {
    return this.config.get(kAllNewlines) ?? false;
  }
}
