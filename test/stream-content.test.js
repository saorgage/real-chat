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
const GageChatPlugin = mainModule.exports;

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

test('migrates legacy API keys to SecretStorage and saves only secret IDs', async () => {
  const secretValues = new Map();
  const plugin = Object.create(GageChatPlugin.prototype);
  plugin.app = {
    secretStorage: {
      setSecret: (id, value) => secretValues.set(id, value),
      getSecret: (id) => secretValues.get(id) || null
    }
  };
  plugin.loadData = async () => ({
    apiKey: 'test-only-deepseek-key',
    orKey: 'test-only-openrouter-key',
    mistralKey: 'test-only-mistral-key',
    visionKey: 'test-only-vision-key',
    braveKey: 'test-only-brave-key',
    tavilyKey: 'test-only-tavily-key',
    provider: 'mistral'
  });
  let savedSettings;
  plugin.saveData = async (settings) => { savedSettings = JSON.parse(JSON.stringify(settings)); };

  await plugin.loadSettings();

  const settingNames = ['apiKeySecret', 'orKeySecret', 'mistralKeySecret', 'visionKeySecret', 'braveKeySecret', 'tavilyKeySecret'];
  assert.equal(secretValues.size, settingNames.length);
  for (const settingName of settingNames) {
    const secretId = plugin.settings[settingName];
    assert.ok(secretId);
    assert.equal(plugin.getSecret(settingName), secretValues.get(secretId));
  }
  for (const legacyName of ['apiKey', 'orKey', 'mistralKey', 'visionKey', 'braveKey', 'tavilyKey']) {
    assert.equal(Object.hasOwn(savedSettings, legacyName), false);
  }
  assert.equal(JSON.stringify(savedSettings).includes('test-only-'), false);
  assert.equal(savedSettings.provider, 'mistral');
});
