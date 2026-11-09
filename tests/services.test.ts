import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpClient } from '../src/services/http.js';
import { Roblox } from '../src/services/roblox.js';
import { readConfig } from '../src/config.js';
const config = readConfig({
  DISCORD_TOKEN: 'fake',
  GUILD_ID: '100000000000000001',
});
const http = () => new HttpClient('test');
const json = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });

test('Roblox uses username lookup, caches missing users and coalesces requests', async (t) => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    requests++;
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body as string), {
      usernames: ['Missing'],
      excludeBannedUsers: false,
    });
    return json({ data: [] });
  });
  const roblox = new Roblox(http(), config);
  await assert.rejects(roblox.lookup('Missing'), /could not be found/);
  await assert.rejects(roblox.lookup('Missing'), /could not be found/);
  assert.equal(requests, 1);
  await assert.rejects(roblox.lookup('display name'), /username/);
});

test('Roblox profile survives a thumbnail outage and handles absent community membership', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.includes('thumbnails.')) throw new Error('no thumbnail');
    if (url.includes('/groups/roles')) return json({ data: [] });
    return json({ id: 123, name: 'Player', displayName: 'Display', created: '2020-01-01' });
  });
  const roblox = new Roblox(http(), config);
  const user = await roblox.profile(123);
  assert.equal(user.name, 'Player');
  assert.equal(user.avatar, null);
  assert.equal(await roblox.role(123), null);
});
