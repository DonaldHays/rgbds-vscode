'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

class SyntaxInfo {
  instructions: string[];
  instructionsWithoutSet: string[];
  preprocessorKeywords: string[];
  instructionsJSON: {
    instructions : [{
      name: string,
      description: string,
      optionalA?: boolean,
      aliasHLI?: boolean,
      aliasHLD?: boolean,
      cycles: number,
      bytes: number,
      flags: {
        z?: string,
        n?: string,
        h?: string,
        c?: string
      }
    }]
  };
  
  keywordsJSON: {
    keywords: [{
      name: string,
      rules: [{
        family: "register"|"function"|"sectionDeclaration"|"conditionCode"|"preprocessor"|"dataDirective",
        context: "any"|"section"|"firstWord"|"notFirstWord"
      }]
    }]
  };
  
  constructor() {
    const extension = vscode.extensions.getExtension("donaldhays.rgbds-z80")!;
    const instructionsJSONPath = path.join(extension.extensionPath, "instructions.json");
    const keywordsJSONPath = path.join(extension.extensionPath, "keywords.json");
    this.instructionsJSON = JSON.parse(fs.readFileSync(instructionsJSONPath, "utf8"));
    this.keywordsJSON = JSON.parse(fs.readFileSync(keywordsJSONPath, "utf8"));
    
    const instructions = new Set<string>();
    this.instructionsJSON.instructions.forEach((instruction) => {
      instructions.add(instruction.name.split(" ")[0]);
    });
    
    this.instructions = Array.from(instructions);
    
    instructions.delete("set");
    this.instructionsWithoutSet = Array.from(instructions);
    
    this.preprocessorKeywords = [];
    this.keywordsJSON.keywords.forEach((keyword) => {
      keyword.rules.forEach((rule) => {
        if (rule.family == "sectionDeclaration" || rule.family == "preprocessor" || rule.family == "dataDirective") {
          this.preprocessorKeywords.push(keyword.name);
        }
      });
    });
  }
};


export let syntaxInfo = new SyntaxInfo();
