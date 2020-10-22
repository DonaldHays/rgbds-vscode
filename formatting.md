# Capitalization Formatting

RGBDS is case-insensitive for everything except labels, so `set` and `SET` are the same. Developers have different rules for how they prefer code be capitalized. This extension supports a robust, inheritance-based rule system for configuring capitalization. It allows configuring simple rules in as few as a single declaration, but also allows highly granular configurations.

## How it Works

You configure capitalization through the `rgbdsz80.formatting.capitalization` setting. It takes a dictionary containing _scopes_ as keys and _rules_ as values. The root scope is `language`. Every case-insensitive part of the language is classified under a tree that branches from the root scope. Rules can be `upper` or `lower`.

A rule applies to everything in a scope. Rules with a narrower scope override rules with a broader scope.

### Examples

#### All Lower
```
"rgbdsz80.formatting.capitalization": {
  "language": "lower",
}
```

```
include "MyHeader.inc"

section "My Section", rom0

routine::
  ld a, 0
```

#### All Upper
```
"rgbdsz80.formatting.capitalization": {
  "language": "upper",
}
```

```
INCLUDE "MyHeader.inc"

SECTION "My Section", ROM0

routine::
  LD A, 0
```

#### All Upper Except Section Declarations
```
"rgbdsz80.formatting.capitalization": {
  "language": "upper",
  "language.keyword.sectiondeclaration": "lower"
}
```

```
INCLUDE "MyHeader.inc"

section "My Section", rom0

routine::
  LD A, 0
```

#### All Upper Except `include`
```
"rgbdsz80.formatting.capitalization": {
  "language": "upper",
  "language.keyword.preprocessor.include": "lower"
}
```

```
include "MyHeader.inc"

SECTION "My Section", ROM0

routine::
  LD A, 0
```

## Classification

### `language`
#### `language.keyword`
##### `language.keyword.preprocessor`
`include, incbin, export, global, union, fragment, nextu, endu, printt, printv, printi, printf, fail, warn, if, elif, else, endc, purge, rept, endr, opt, popo, pusho, pops, pushs, equ, set, equs, macro, endm, shift, charmap`

##### `language.keyword.datadirective`

`rsreset, rb, rw, rl, db, dw, dl, ds`

##### `language.keyword.sectiondeclaration`

`section, rom0, romx, vram, sram, wram0, wramx, oam, hram, align, bank`

##### `language.keyword.function`

`mul, sin, cos, tan, asin, acos, atan, atan2, strcat, strcmp, strin, strlen, strlwr, strsub, strupr, bank, def, high, low`

##### `language.register`

`a, f, b, c, d, e, h, l, af, bc, de, hl, hli, hld, sp, pc`

##### `language.conditioncode`

`z, nz, c, nc`

##### `language.instruction`

`adc, add, and, bit, call, ccf, cp, cpl, daa, dec, di, ei, halt, inc, jp, jr, ld, ldh, nop, or, pop, push, res, ret, reti, rl, rla, rlc, rlca, rr, rra, rrc, rrca, rst, sbc, scf, set, sla, sra, srl, stop, sub, swap, xor`

##### `language.hex`

Capitalization for the letter parts of hex number literals.
