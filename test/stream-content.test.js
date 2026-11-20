'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const obsidianMock = {
  Plugin: class {},
  ItemView: class {},
  PluginSettingTab: class {},
  Setting: class {},
  Notice: class {},
  MarkdownRenderer: class {},
  TFile: class {},
  Modal: class {},
  MarkdownView: class {},
  requestUrl: () => {},
  Platform: { isMobile: false },
  setIcon: () => {}
};
const originalLoad = Module._load;
const mainPath = require.resolve('../main');
const mainModule = new Module(mainPath, module);
mainModule.filename = mainPath;
mainModule.paths = Module._nodeModulePaths(path.dirname(mainPath));
Module._load = function (request, parent, isMain) {
  if (request === 'obsidian') return obsidianMock;
  return originalLoad.call(this, request, parent, isMain);
};
try {
  const source = fs.readFileSync(mainPath, 'utf8') + '\nmodule.exports.GageChatView = GageChatView;';
  mainModule._compile(source, mainPath);
} finally {
  Module._load = originalLoad;
}
const GageChatView = mainModule.exports.GageChatView;

test('streams string and text-block content without stringifying objects', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const chunks = [
    { choices: [{ delta: { content: 'Hello ' } }] },
    { choices: [{ delta: { content: [
      { type: 'text', text: 'from Mistral' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } },
      { type: 'text', text: '!' },
      { type: 'text', text: { nested: 'not text' } }
    ] } }] }
  ];
  const sse = chunks.map(chunk => 'data: ' + JSON.stringify(chunk) + '\n').join('') + 'data: [DONE]\n';
  globalThis.fetch = async () => ({
    ok: true,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(sse));
        controller.close();
      }
    })
  });

  const view = Object.create(GageChatView.prototype);
  view.plugin = { settings: { temperature: 0, allowRunCommand: false, webEnabled: false } };
  const deltas = [];
  const result = await view.callDeepSeekStream([], null, (delta, kind) => deltas.push({ delta, kind }), {
    model: 'mistral-large-latest',
    baseUrl: 'https://example.test',
    key: 'test',
    headers: {}
  });

  assert.equal(result.message.content, 'Hello from Mistral!');
  assert.deepEqual(deltas, [
    { delta: 'Hello ', kind: 'content' },
    { delta: 'from Mistral!', kind: 'content' }
  ]);
});
