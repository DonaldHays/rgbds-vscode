# Change Log
All notable changes to the "rgbds-vscode" extension will be documented in this file.

## [4.2.0] - 2025-??-??

Thanks to RubenZwietering for improvements in this release!

### Added
- Support for `hli`/`hld` instructions. (Thanks, RubenZwietering!)

### Changed
- Completion prompts for `ld [c], a` and `ld a, [c]` are now `ldh [c], a` and `ldh a, [c]`.
- Improved completion suggestions on `include` directives.
  - Triggering IntelliSense after already having typed part of the path will now
    filter suggestions.
  - Better tab completion.
  - The workspace root is now searched for include files.
  - Suggestions now search for `.s` and `.sm83` files.
  - Suggestions may be filtered by file extension using the
    `rgbdsz80.includeSuggestionExtensions` configuration variable.
  - Suggestions no longer automatically search relative to the working file.
  - Suggestions are resolved relative to the deepest matching entry in
    `"rgbdsz80.includePath"`. For example, if the include path setting has
    `"src/"` and `"src/battle/"`, the file `"src/battle/turns.asm"` will be
    suggested as `"turns.asm"`.
  - A warning diagnostic is now provided if the extension cannot find an
    included file.

### Fixed
- Document links on `include` directives now work on lines that begin with whitespace.
- Files in include directives are now searched for relative to the workspace root, and are no longer searched relative to the current file.
- Symbols exported via `export` are now correctly recognized as exported in IntelliSense. (Thanks, RubenZwietering!)

## [4.1.0] - 2024-04-06

### Added
- Support for the `endsection` keyword.
- Support for the `incharmap` function.
- Support for completions when writing multiple instructions per line via `::`.
- Support for `#"raw strings"`.
- Support for the `#` and `@` characters in symbol names.

### Fixed
- rb/rw/rl definition expressions that omit values are now recognized for completions and documentation.

## [4.0.1] - 2023-07-16

Thanks to sukus21 for the improvements in this release!

### Fixed
 - Offset constants (declared with `rb`, `rw` and `rl`) would not get documented.
 - Include paths on windows now convert all backslashes to forward slashes, not just the first one.

## [4.0.0] - 2023-06-27

Thanks to sukus21 for the improvements in this release!

### Added
 - Suggested included files will now use forward slash as directory separator on Windows.
 - The ability to jump to included files by ctrl+clicking the include statement.

### Removed
 - Support for colon-less label declarations.

### Fixed
 - Invoking a macro would mistakingly be seen as re-declaring it.

## [3.2.1] - 2023-06-21
### Added
 - Support for indented documentation.
 - Support for indented macro definitions.

## [3.2.0] - 2023-04-30
### Added
- Support for the `fmod` function.
- Support for precise fixed-point literals (e.g. 12.34q8).

## [3.1.0] - 2022-08-28
### Added
- Support for the `fatal`, `assert`, and `static_assert` assertion keywords.
- Support for the `for` and `break` repeat block keywords.
- Support for the `div` math function.
- Support for the `charlen` and `charsub` string functions.
- Support for the `sizeof` and `startof` section functions.
- Support for underscores in number literals.

### Changed
- Improved hover recognition of number literals.

## [3.0.1] - 2022-08-04
### Fixed
- Instances of "set" contained as part of other words are no longer impacted by the `"language.keyword.preprocessor"` rule.

## [3.0.0] - 2021-06-30
### Added
- Support for the `print`, `println`, and `redef` keywords.
- Support for the `ceil`, `floor`, `log`, `pow`, `round`, `strfmt`, `strrin`, and `strrpl` functions.
- Support for the new macro definition syntax.
- Support for the new def constant syntax.
- Support for indented global labels.

## [2.7.1] - 2021-03-25
### Changed
- When every line of a doc comment shares a common prefix (like "--" in hardware.inc), the prefix will now be clipped out of the documentation view.

## [2.7.0] - 2021-02-28
### Added
- Support for C-style block comments.
- Auto-indentation support for labels.

### Changed
- Improved bracket matching and auto-completion support.
- Now disables "editor.wordBasedSuggestions" by default when `gbz80` handles a document to better match only relevant content within the file.

## [2.6.0] - 2020-11-07
### Changed
- Modernized problem matchers for the current version of RGBDS. (Thanks, jendrikw!)
- Added support for new keywords. (Thanks, jendrikw and Rangi42!)

## [2.5.1] - 2020-02-11
### Fixed
- Spaces are no longer allowed as part of a label where only a period was supposed to be supported. 😬

## [2.5.0] - 2020-02-11
### Added
- Local labels are now shown in IntelliSense prompts, appropriately limited to the current scope.

### Fixed
- Some ways of writing local labels will no longer cause similar global labels to fail to export.

## [2.4.1] - 2019-05-30
### Fixed
- The completion proposer should no longer sometimes fail to include newlines between some items in the "flags changed" section.

## [2.4.0] - 2019-04-26
### Added
- Setting the new configuration option `rgbdsz80.showInstructionCompletionSuggestions` to `false` will suppress completion suggestions for instructions.

## [2.3.0] - 2019-02-17
### Added
- The extension will now activate for files with an extension of `.sm83`.

### Fixed
- The parsing grammar now correctly identifies lines that begin with an asterisk as a comment.

## [2.2.0] - 2019-02-10
### Added
- A new problem matcher named `rgbdslinkerror`, which can catch several additional types of errors. Both it and `rgbdserror` must be included in a problem matcher configuration to be used.
- New instruction completions for `ld [c], a` and `ld a, [c]`.

### Fixed
- The completion snippets for macros and repeat blocks now respect capitalization preferences.

## [2.1.0] - 2018-10-20
### Added
- Setting the new configuration option `rgbdsz80.includeAllDocCommentNewlines` to `true` will force a newline between all doc comment lines in the formatted Markdown.

### Changed
- Comments that begin with @ will now only have a single newline preceding them instead of two in the formatted Markdown.

### Fixed
- Register capitalization formatting is now correctly reflected in IntelliSense prompts.
- Two spaces at the end of a doc comment line should now correctly force a newline in the formatted Markdown.

## [2.0.0] - 2018-08-30
### Added
- [Capitalization Formatting](https://github.com/DonaldHays/rgbds-vscode/blob/master/formatting.md) support.
- IntelliSense support for project files in include statements.
- All keywords, registers, and condition codes are now present in IntelliSense prompts.

### Changed
- IntelliSense prompts are now populated based on some basic context information to reduce invalid options.
- The problem matcher has been _improved_ but not _fixed_. It does a better job of reporting certain errors, but there are some where it won't underline the error in context.
- Refined the syntax highlighting grammer. Some parts of the language were reclassified, so you may see some color changes with your theme.

## [1.5.1] - 2018-07-03
### Changed
- Documentation comment lines that begin with `@` now receive a leading newline.

## [1.5.0] - 2018-06-09
### Added
- Support for searching for include files via `rgbdsz80.includePath` configuration variable.

## [1.4.2] - 2018-05-27
### Added
- `acos`, `asin`, `atan`, `atan2`, `charmap`, `cos`, `def`, `div`, `high`, `low`, `mul`, `sin`, `strcat`, `strcmp`, `strin`, `strlen`, `strlwr`, `strsub`, `strupr`, and `tan` are now recognized as keywords.

## [1.4.1] - 2018-04-17
### Added
- Files with an extension of `.s` are now recognized by the extension.

## [1.4.0] - 2018-04-13
### Added
- Added the ability to see all symbol declarations within a file (`Cmd+Shift+O` or `Ctrl+Shift+O`) or the entire workspace (`Cmd+T` or `Ctrl+T`).

## [1.3.4] - 2018-04-12
### Added
- `rom0`, `romx`, `vram`, `sram`, `wram0`, `wramx`, `oam`, `hram`, `bank`, and `align` are now recognized as keywords.

## [1.3.3] - 2018-04-02
### Fixed
- Fixed highlighting `repeat` instead of `rept`.

## [1.3.2] - 2018-04-01
### Fixed
- Removed some false positive cases that could result in out-of-scope symbol declarations appearing in IntelliSense.

### Added
- Added a snippet for repeat blocks.

## [1.3.1] - 2018-03-31
### Added
- Added support for additional instruction aliases in IntelliSense.

## [1.3.0] - 2018-03-29
### Changed
- Improved IntelliSense support for instructions.

## [1.2.0] - 2018-03-20
### Changed
- Symbol seeking for IntelliSense has been made more inclusive. Now grabs symbols from files that include the working file.

## [1.1.0] - 2018-03-19
### Fixed
- The symbol extractor no longer extracts RGBDS keywords as symbols.

### Added
- Declarations using `equ`, `set`, `equs` now have their expression included in their doc comment.

## [1.0.0] - 2018-03-17
- Initial release
