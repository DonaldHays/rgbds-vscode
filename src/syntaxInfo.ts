'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export enum KeywordFamily {
  Register = "register",
  Function = "function",
  SectionDeclaration = "sectionDeclaration",
  ConditionCode = "conditionCode",
  Preprocessor = "preprocessor",
  DataDirective = "dataDirective",
}

export enum KeywordRuleContext {
  Any = "any",
  Section = "section",
  FirstWord = "firstWord",
  NotFirstWord = "notFirstWord",
}

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
      available: string|undefined,
      deprecated: string|undefined,
      rules: [{
        family: KeywordFamily,
        context: KeywordRuleContext
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
    
    this.preprocessorKeywords = this.keywordsQuery({hasFamily: [KeywordFamily.SectionDeclaration, KeywordFamily.Preprocessor, KeywordFamily.DataDirective]});
  }
  
  keywordsQuery(query: { hasFamily?: KeywordFamily[], hasContext?: KeywordRuleContext[] }): string[] {
    return this.keywordsJSON.keywords.filter((keyword) => {
      const hasFamily = query.hasFamily;
      const hasContext = query.hasContext;
      
      if (hasFamily) {
        if (keyword.rules.reduce((accumulator, rule) => accumulator || hasFamily.includes(rule.family), false) == false) {
          return false;
        }
      }
      
      if (hasContext) {
        if (keyword.rules.reduce((accumulator, rule) => accumulator || hasContext.includes(rule.context), false) == false) {
          return false;
        }
      }
      
      return true;
    }).map((keyword) => keyword.name);
  }
};


export let syntaxInfo = new SyntaxInfo();
