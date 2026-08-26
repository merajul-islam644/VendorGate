// Diagnostic test for the playwrightGutter click pipeline.
// Renders a real CodeMirror view in jsdom, mounts the gutter, dispatches
// a synthetic mousedown, and verifies whether onPlayLine is invoked.

import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  pretendToBeVisual: true
});

// Expose the jsdom globals on globalThis so CodeMirror can find them.
Object.defineProperty(globalThis, "window", { value: dom.window, writable: true, configurable: true });
Object.defineProperty(globalThis, "document", { value: dom.window.document, writable: true, configurable: true });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, writable: true, configurable: true });
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
// jsdom doesn't expose MutationObserver until you ask for it.
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

const { EditorView } = await import("@codemirror/view");
const { playwrightGutter } = await import("../src/features/repo-browser/playwrightGutter.ts");

// --- 1. Pure-logic probe: does detectPlaywrightBlocks produce the right
// ---    line numbers for a known input? Hand-roll it from the regex so
// ---    we don't need to import the .tsx file.

const TEST_LINE = /^\s*(test|test\.describe|test\.step)\s*(?:\.\w+\s*)?\(/;
const SOURCE = [
  "import { test, expect } from '@playwright/test';",
  "",
  "test('first', async ({ page }) => {",
  "  await page.goto('https://example.com');",
  "});",
  "",
  "test.describe('group', () => {",
  "  test('inner', async ({ page }) => {});",
  "});",
].join("\n");

function detectBlocks(src) {
  const blocks = [];
  const re = /\b(test\.describe|test\.step|test)(?=\s*\()/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = re.lastIndex;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] !== "(") continue;
    blocks.push({
      kind: m[1],
      name: "x",
      matchIndex: m.index,
      lineStart: lineOf(src, m.index)
    });
  }
  return blocks;
}

function lineOf(src, idx) {
  let line = 0;
  for (let i = 0; i < idx; i++) if (src[i] === "\n") line++;
  return line;
}

console.log("\n=== Pure logic probe ===");
const detected = detectBlocks(SOURCE);
detected.forEach((b, i) => {
  console.log(`block ${i}: kind=${b.kind} matchIndex=${b.matchIndex} 0-based-line=${b.lineStart} 1-based-line=${b.lineStart + 1}`);
});

// --- 2. Mount a real EditorView in jsdom with the gutter. Verify
// ---    gutter markers render and mousedown fires onPlayLine.

console.log("\n=== Live EditorView probe ===");
const root = document.getElementById("root");

let capturedLineNumber = null;
let capturedKind = null;
const onPlayLine = (lineNumber, kind) => {
  console.log(`>> onPlayLine called with lineNumber=${lineNumber} kind=${kind}`);
  capturedLineNumber = lineNumber;
  capturedKind = kind;
};

const view = new EditorView({
  doc: SOURCE,
  extensions: [playwrightGutter(onPlayLine)],
  parent: root
});

// Give CodeMirror a moment to render.
await new Promise((r) => setTimeout(r, 100));

// Inspect what the gutter actually rendered.
const gutterEls = root.querySelectorAll(".cm-pw-gutter .cm-pw-gutter-play");
console.log(`Play buttons rendered in gutter: ${gutterEls.length}`);
gutterEls.forEach((btn, i) => {
  const wrapper = btn.closest(".cm-gutterElement");
  const lineRange = wrapper?.getAttribute("aria-label") ?? "(no aria)";
  console.log(`  button ${i}: classes="${btn.className}" line aria="${lineRange}" data-line="${btn.dataset.line}" data-kind="${btn.dataset.kind}"`);
});

if (gutterEls.length === 0) {
  console.log("FAIL: no Play buttons rendered. The gutter regex isn't matching in CodeMirror's view of the doc.");
  process.exit(1);
}

// Dispatch a real mousedown on the first button.
console.log("\n=== Dispatching click on first Play button (DOM-direct listener) ===");
const target = gutterEls[0];
console.log("target dataset:", { line: target.dataset.line, kind: target.dataset.kind });
const evt = new dom.window.MouseEvent("click", {
  bubbles: true,
  cancelable: true,
  button: 0,
  view: dom.window
});
target.dispatchEvent(evt);

// jsdom click handlers run synchronously; give the event loop a tick.
await new Promise((r) => setTimeout(r, 50));

if (capturedLineNumber === null) {
  console.log("FAIL: click did NOT call onPlayLine. The DOM-level handler didn't fire.");
  console.log("This is the bug. Inspect playwrightGutter.ts and the marker DOM wiring.");
  process.exit(1);
}

console.log(`PASS: onPlayLine received lineNumber=${capturedLineNumber}`);
if (capturedLineNumber !== 3) {
  console.log(`WARN: expected lineNumber=3 (line of first 'test('), got ${capturedLineNumber}. There's a line-number drift.`);
}

// --- 3. Verify CodeMirror's line numbers agree with our block.startLine+1.
console.log("\n=== Cross-check: doc.lineAt(start).number for each block ===");
for (const b of detected) {
  const lineObj = view.state.doc.lineAt(b.matchIndex);
  const cmLineNumber = lineObj.number;
  console.log(`  block kind=${b.kind}: block.startLine+1=${b.lineStart + 1} | cm.lineAt(matchIndex).number=${cmLineNumber}`);
}

console.log("\nDone.");
