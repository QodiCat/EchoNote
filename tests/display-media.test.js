const test = require('node:test');
const assert = require('node:assert/strict');
const { createDisplayMediaHandler } = require('../electron/display-media');

test('grants an actual desktop source and system loopback audio', async () => {
  const source = { id: 'screen:0:0', name: 'Screen' };
  const responses = [];
  const handler = createDisplayMediaHandler({
    async getSources(options) {
      assert.deepEqual(options.types, ['screen']);
      return [source];
    }
  });
  await handler({ videoRequested: true, audioRequested: true }, value => responses.push(value));
  assert.deepEqual(responses, [{ video: source, audio: 'loopback' }]);
  assert.equal(responses[0].video, source);
});

test('denies capture once when no screen is available', async () => {
  const responses = [];
  const handler = createDisplayMediaHandler({ async getSources() { return []; } });
  await handler({}, value => responses.push(value));
  assert.deepEqual(responses, [{}]);
});

test('handles source enumeration rejection and denies capture', async () => {
  const responses = [];
  const errors = [];
  const handler = createDisplayMediaHandler({
    async getSources() { throw new Error('enumeration failed'); }
  }, message => errors.push(message));
  await handler({}, value => responses.push(value));
  assert.deepEqual(responses, [{}]);
  assert.equal(errors.length, 1);
});
