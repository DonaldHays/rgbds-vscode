# Change Log
All notable changes to the "rgbds-z80" extension will be documented in this file.

## [2.7.0] - 2021-??-??
### Added
- Support for C-style block comments.
- Auto-indentation support for labels.

### Changed
- Improved bracket matching and auto-completion support.

## [2.6.0] - 2020-11-07
### Changed
- Modernized problem matchers for the current version of RGBDS. (Thanks, jendrikw!)
- Added support for new keywords. (Thanks, jendrikw and Rangi42!)

## [2.5.1] - 2020-02-11
### Fixed
- Spaces are no longer allowed as part of a label where only a period was supposed to be supported. 😬

## [2.5.0] - 2020-02-11
### Added
- Local labels are now shown in intellisense prompts, appropriately limited to the current scope.

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
- Register capitalization formatting is now correctly reflected in intellisense prompts.
- Two spaces at the end of a doc comment line should now correctly force a newline in the formatted Markdown.

## [2.0.0] - 2018-08-30
### Added
- [Capitalization Formatting](https://github.com/DonaldHays/rgbds-vscode/blob/master/formatting.md) support.
- Intellisense support for project files in include statements.
- All keywords, registers, and condition codes are now present in intellisense prompts.

### Changed
- Intellisense prompts are now populated based on some basic context information to reduce invalid options.
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
- Removed some false positive cases that could result in out-of-scope symbol declarations appearing in Intellisense.

### Added
- Added a snippet for repeat blocks.

## [1.3.1] - 2018-03-31
### Added
- Added support for additional instruction aliases in Intellisense.

## [1.3.0] - 2018-03-29
### Changed
- Improved Intellisense support for instructions.

## [1.2.0] - 2018-03-20
### Changed
- Symbol seeking for Intellisense has been made more inclusive. Now grabs symbols from files that include the working file.

## [1.1.0] - 2018-03-19
### Fixed
- The symbol extractor no longer extracts RGBDS keywords as symbols.

### Added
- Declarations using `equ`, `set`, `equs` now have their expression included in their doc comment.

## [1.0.0] - 2018-03-17
- Initial release
