# RGBDS GBZ80

This extension provides support for the RGBDS flavor of the Game Boy's Z80 variant assembly language in Visual Studio Code.

## Features

### Syntax Highlighting Grammar

A full grammar definition for syntax highlighting is included.

![syntax highlighting](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/syntax-highlighting.png)

### Documented Instruction Snippets

Instruction snippets reveal and document every instruction the Game Boy CPU understands. The documentation even includes the number of cycles instructions take!

![documented snippets](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/instruction-snippets.gif)


### Problem Matcher

An included problem matcher enables Visual Studio Code to highlight invalid lines of code when you compile.

![problem matcher](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/problem-matcher.gif)

### Documented Symbol Detection

Symbols you declare are detected and populated in Intellisense prompts. It even grabs your documentation comments!
- Any uninterrupted runs of lines that consist only of comments preceding a symbol declaration will be considered part of that symbol's documentation.
- A comment on the same line as a symbol declaration is also part of its documentation.

![intellisense](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/doc-comment.gif)

### Documentation Hovers

Hover over symbol references to see their documentation at a glance.

![Syntax highlighting grammar](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/hovers.gif)

### Jump to Declaration

For when you need to see a symbol's implementation.

![Syntax highlighting grammar](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/definition.gif)

## Usage

The language support will automatically activate for any file with `.z80`, `.asm`, or `.inc` file extensions.

### Using the Problem Matcher

The `rgbasm` problem matcher is named "rgbdserror". The following is an example of a build task that calls `make` and uses the problem matcher.

```JSON
{
  "label": "build",
  "type": "shell",
  "command": "make",
  "group": {
    "kind": "build",
    "isDefault": true
  },
  "presentation": {
    "panel": "new"
  },
  "problemMatcher": "$rgbdserror"
}
```
