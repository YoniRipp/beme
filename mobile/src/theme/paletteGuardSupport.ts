import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Shared AST-parsing helpers for the two "frozen theme" guard tests
 * (`__tests__/noFrozenPaletteImports.test.ts`, `__tests__/rawTextNamesItsFont.test.ts`).
 *
 * Deliberately NOT under `__tests__/`: Jest's default `testMatch` treats every file
 * under a `__tests__` directory as its own suite (no override in `jest.config.js`), so
 * a helper module with no `it()` would fail with "must contain at least one test" if it
 * lived there.
 *
 * Both guards used to be plain-text regex scans. A review proved that shape evadable by
 * ordinary code no linter here forbids:
 *   - `from "react-native"` (double quotes) — the font guard's regex was single-quote only
 *   - a comment containing the word "fonts" — the font guard's second check matched
 *     `/\bfonts\b/` anywhere in the file, comments included
 *   - `import * as Theme from '../theme'` then `Theme.colors.text` — the palette guard
 *     only matched a named `{ colors }` import
 *   - `require('../theme')` — same guard, different syntax
 *   - `import { lightColors } from '../theme'` used directly in a module-level
 *     `StyleSheet.create` — exactly as frozen as `colors`, but not the one name the old
 *     regex looked for
 *
 * Parsing with the TypeScript compiler API (already a dependency — `mobile/package.json`
 * devDependencies) closes all of these at once: quote style is not part of the AST, and
 * an import's real specifiers/namespace/`require` target are structural facts rather
 * than text shapes to keep re-guessing. It also removes a footgun the old regex needed a
 * manual workaround for: `theme.ts`'s own docblock *quotes* the old import pattern as
 * prose, which a text scan cannot tell from real code. A comment is invisible to the AST,
 * so no such allowlist entry is needed here.
 */

/** `mobile/src` — every guard scans from here down. */
export const SRC_ROOT = path.join(__dirname, '..');

/** Recursively lists source files under `dir` matching `extensions`, skipping `__tests__`/`node_modules`/`.d.ts`. */
export function collectSourceFiles(dir: string, extensions: RegExp): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath, extensions));
    } else if (extensions.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Parses one file into a TS AST. Script kind follows the real extension, not a guess. */
export function parseSourceFile(filePath: string): ts.SourceFile {
  const text = fs.readFileSync(filePath, 'utf8');
  const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, kind);
}

/** One `import ... from '...'` statement's structurally real shape — quote style notwithstanding. */
export interface ImportInfo {
  moduleSpecifier: string;
  /** Exported names bound by `{ ... }` — for `{ a, b as c }` this is `['a', 'b']` (the exported name, not the local alias `c`). */
  namedImports: string[];
  /** True for `import * as X from '...'`. */
  isNamespaceImport: boolean;
}

/** Every static `import` declaration in a file, in source order. */
export function collectImports(sourceFile: ts.SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const moduleSpecifier = node.moduleSpecifier.text;
    const namedImports: string[] = [];
    let isNamespaceImport = false;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) {
        // `el.propertyName` is set for `{ real as alias }` — the EXPORTED name is what
        // matters here (it's what selects `colors`/`lightColors`/`darkColors` out of the
        // module), not whatever local alias the importer chose to call it.
        namedImports.push((el.propertyName ?? el.name).text);
      }
    } else if (bindings && ts.isNamespaceImport(bindings)) {
      isNamespaceImport = true;
    }
    imports.push({ moduleSpecifier, namedImports, isNamespaceImport });
  });
  return imports;
}

/** Every `require('...')` call's string argument, anywhere in the file (not just top-level). */
export function collectRequireCalls(sourceFile: ts.SourceFile): string[] {
  const specifiers: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push((node.arguments[0] as ts.StringLiteral).text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

/** True if `specifier` is a relative import (`./…`/`../…`) whose last path segment is exactly `baseName`. */
export function isRelativeModule(specifier: string, baseName: string): boolean {
  return /^\.\.?\//.test(specifier) && specifier.endsWith(`/${baseName}`);
}

/** A hex colour literal: `#abc`, `#aabbcc`, or `#aabbccdd`, as a whole string value (not a substring). */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export interface HexLiteralHit {
  value: string;
  /** 1-based line number, for a message a human can jump to. */
  line: number;
}

/**
 * Every JSX tag name used in a file — `<Foo />` and `<Foo>…</Foo>` alike, plus the
 * namespaced form `<Foo.Bar />` (recorded as its root, `Foo`, which is the identifier an
 * import binds).
 *
 * Used by the allowlist-expiry check in `noFrozenPaletteImports.test.ts`: "this component
 * has no call sites" is a claim about the codebase, and this is what re-evaluates it. A
 * grep would answer the same question until the day it doesn't — a name in a comment, a
 * string, or its own definition all match text and none of them is a call site.
 */
export function collectJsxElementNames(sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];
  const rootName = (tag: ts.JsxTagNameExpression): string | undefined => {
    if (ts.isIdentifier(tag)) return tag.text;
    if (ts.isPropertyAccessExpression(tag)) {
      let expr: ts.Expression = tag;
      while (ts.isPropertyAccessExpression(expr)) expr = expr.expression;
      return ts.isIdentifier(expr) ? expr.text : undefined;
    }
    return undefined;
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = rootName(node.tagName);
      if (name) names.push(name);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

export function collectHexColorLiterals(sourceFile: ts.SourceFile): HexLiteralHit[] {
  const hits: HexLiteralHit[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) && HEX_COLOR.test(node.text)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      hits.push({ value: node.text, line: line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}
