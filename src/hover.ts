'use strict';

import { HoverProvider, TextDocument, Position, CancellationToken, ProviderResult, Hover, MarkdownString } from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';

const hexRegex = /^\$([\da-fA-F][_\da-fA-F]*)$/;
const binaryRegex = /^\%([01][_01]*)$/;
const octalRegex = /^\&([0-7][_0-7]*)$/;
const integerRegex = /^(\d[_\d]*)$/;
const fixedRegex = /^(\d[_\d]*\.\d+)$/;
const hoverRegex = /(\$[\da-fA-F][_\da-fA-F]*)|(\%[01][_01]*)|(\&[0-7][_0-7]*)|(\`[0-3][_0-3]*)|(\d[_\d]*(\.\d+)?)|(\.?[A-Za-z_]\w*(\\@|:*))/g;

export class ASMHoverProvider implements HoverProvider {
  constructor(public symbolDocumenter: ASMSymbolDocumenter) {

  }

  provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
    const range = document.getWordRangeAtPosition(position, hoverRegex);
    if (range) {
      const text = document.getText(range);
      const symbol = this.symbolDocumenter.symbol(text, document);
      let numberValue: number | undefined = undefined;
      if (symbol !== undefined && symbol.documentation !== undefined) {
        return new Hover(new MarkdownString(symbol.documentation), range);
      } else if (hexRegex.test(text)) {
        numberValue = parseInt(hexRegex.exec(text)![1].replace(/_/, ""), 16);
      } else if (binaryRegex.test(text)) {
        numberValue = parseInt(binaryRegex.exec(text)![1].replace(/_/, ""), 2);
      } else if (octalRegex.test(text)) {
        numberValue = parseInt(octalRegex.exec(text)![1].replace(/_/, ""), 8);
      } else if (integerRegex.test(text) && !fixedRegex.test(text)) {
        numberValue = parseInt(text.replace(/_/, ""));
      }

      if (numberValue !== undefined) {
        return new Hover(`\`${numberValue}\`\n\n\`\$${numberValue.toString(16)}\`\n\n\`%${numberValue.toString(2)}\``, range);
      }
    }

    return null;
  }
}
