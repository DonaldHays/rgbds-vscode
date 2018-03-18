# RGBDS GBZ80

This extension provides support for the RGBDS flavor of the Game Boy's Z80 variant assembly language in Visual Studio Code.

## Features

- Syntax highlighting grammar
- Documented snippets for all instructions, including cycle counts and affected flags
- A problem matcher for highlighting `rgbasm` compile-time errors in source code
- Doc comment extraction on symbol declarations
  - Any uninterrupted runs of lines that consist only of comments before a symbol declaration will be considered part of that symbol's documentation
  - A comment on the same line as a symbol declaration is also part of its documentation
- Hovering over symbols will show its documentation
- Symbols appear in intellisense prompts, with documentation
- Ability to jump to a symbol's declaration

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
