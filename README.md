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

Symbols you declare are detected and populated in IntelliSense prompts. It even grabs your documentation comments!
- Any uninterrupted runs of lines that consist only of comments preceding a symbol declaration will be considered part of that symbol's documentation.
- A comment on the same line as a symbol declaration is also part of its documentation.

![IntelliSense](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/doc-comment.gif)

### Documentation Hovers

Hover over symbol references to see their documentation at a glance.

![Syntax highlighting grammar](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/hovers.gif)

### Jump to Declaration

For when you need to see a symbol's implementation.

![Syntax highlighting grammar](https://raw.githubusercontent.com/DonaldHays/rgbds-vscode/master/previews/definition.gif)

## Usage

The language support will automatically activate for any file with `.z80`, `.asm`, `.inc`, `.s`, or `.sm83` file extensions.

### Using the Problem Matchers

The `rgbasm` problem matcher is named "rgbdserror", and the `rgblink` problem matcher is named "rgbdslinkerror". The following is an example of a build task that calls `make` and uses the problem matchers.

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
  "problemMatcher": ["$rgbdserror", "$rgbdslinkerror"]
}
```

### Include Path Searching

This extension supports IntelliSense for symbols declared in included files. By default, it searches for included files relative to the workspace root. But you can configure additional directories to search via the `rgbdsz80.includePath` configuration variable. You may assign a string path or an array of string paths to that variable, and all associated directories will be searched in turn to resolve an included file. Configured paths may be either absolute or relative to the workspace directory.

### Include File Suggestion Filtering

By default, IntelliSense prompts for include directives will suggest files of any supported file extension. However, it's common practice to separate header/include files from implementation/code files, and to use different extensions (such as `.inc`/`.asm`) to differentiate them. By using the `rgbdsz80.includeSuggestionExtensions` configuration variable, you can specify an array of extensions to only be suggested files that have those extensions.

For example, the setting `"rgbdsz80.includeSuggestionExtensions" : [ ".inc" ]` will only suggest files ending in `.inc`.

### Capitalization Formatting

You can customize capitalization rules for your code. See [Capitalization Formatting](https://github.com/DonaldHays/rgbds-vscode/blob/master/formatting.md) for details.
