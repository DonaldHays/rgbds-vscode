# Change Log
All notable changes to the "rgbds-z80" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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
