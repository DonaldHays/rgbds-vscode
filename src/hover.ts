'use strict';

import { HoverProvider, TextDocument, Position, CancellationToken, ProviderResult, Hover, MarkdownString } from 'vscode';
import { ASMSymbolDocumenter } from './symbolDocumenter';

const hexRegex = /^\$([0-9a-fA-F]+)$/;
const binaryRegex = /^%([0-1]+)$/;
const integerRegex = /^([0-9]+)$/;
const hoverRegex = /(\$[0-9a-fA-F]+)|(%[0-1]+)|([0-9]+)|(\.?[A-Za-z_][A-Za-z_0-9]*(\\@|:*))/g;

export class ASMHoverProvider implements HoverProvider {
  constructor(public symbolDocumenter: ASMSymbolDocumenter) {
    
  }
  
  provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
    const range = document.getWordRangeAtPosition(position, hoverRegex);
    if(range) {
      const text = document.getText(range);
      const symbol = this.symbolDocumenter.symbol(text, document);
      let numberValue: number | undefined = undefined;
      if (symbol !== undefined && symbol.documentation !== undefined) {
        return new Hover(new MarkdownString(symbol.documentation), range);
      } else if (hexRegex.test(text)) {
        numberValue = parseInt(hexRegex.exec(text)![1], 16);
      } else if (binaryRegex.test(text)) {
        numberValue = parseInt(binaryRegex.exec(text)![1], 2);
      } else if (integerRegex.test(text)) {
        numberValue = parseInt(text);
      }
      
      if (numberValue !== undefined) {
        return new Hover(`\`${numberValue}\`\n\n\`\$${numberValue.toString(16)}\`\n\n\`%${numberValue.toString(2)}\``, range);
      }
    }
    
    return null;
  }
}
