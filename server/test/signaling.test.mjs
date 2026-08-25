import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';

let openServer;

function getOpenPort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close((error) => {
        if (error) return reject(error);
        resolve(address.port);
      });
    });
  });
}

async function waitForHealthCheck(url) {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // Sunucu başlatılırken bağlantı reddedilmesi beklenir.
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error('Sinyalleşme sunucusu zamanında başlatılamadı.');
}

async function startSignalingServer(extraEnv = {}) {
  const port = await getOpenPort();
  const url = `http://127.0.0.1:${port}`;
  const dataFilePath = path.join(
    os.tmpdir(),
    `bacolar-voice-test-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );

  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), BACOLAR_DATA_FILE: dataFilePath, ...extraEnv },
    stdio: 'ignore'
  });

  await waitForHealthCheck(url);
  return { child, url, dataFilePath };
}

async function stopSignalingServer(server) {
  if (!server) return;
  if (server.child.exitCode === null) {
    const exited = once(server.child, 'exit');
    server.child.kill();
    await exited;
  }
  await rm(server.dataFilePath, { force: true });
}

function waitForEvent(socket, eventName, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`${eventName} olayı zamanında gelmedi.`));
    }, 2_000);

    const onEvent = payload => {
      if (!predicate(payload)) return;
      cleanup();
      resolve(payload);
    };

    const onError = error => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off(eventName, onEvent);
      socket.off('connect_error', onError);
    };

    socket.on(eventName, onEvent);
    socket.once('connect_error', onError);
  });
}

async function connectClient(url = openServer.url, token = '') {
  const socket = io(url, {
    autoConnect: false,
    reconnection: false,
    transports: ['websocket'],
    auth: { token }
  });

  const connected = waitForEvent(socket, 'connect');
  socket.connect();
  await connected;
  return socket;
}

// Sunucu tanımadığı bir kimlik için yeni kullanıcı üretir ve id'yi kendisi
// atar; yönlendirme testleri bu gerçek id'ye bakmalı.
async function authenticate(socket, userId, username) {
  const authorized = waitForEvent(socket, 'auth-success');
  socket.emit('authenticate', { userId, username, tag: '1001', avatar: 'avatar-cyber-ninja' });
  const { user } = await authorized;
  return user.id;
}

before(async () => {
  openServer = await startSignalingServer();
});

after(async () => {
  await stopSignalingServer(openServer);
});

test('acknowledges a client ping', async () => {
  const socket = await connectClient();
  const acknowledged = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Ping ACK alınamadı.')), 1_000);
    socket.emit('ping', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  await acknowledged;
  socket.disconnect();
});

test('synchronizes a newly created room to the creator', async () => {
  const socket = await connectClient();
  const initialRoomSync = waitForEvent(socket, 'rooms-sync');

  socket.emit('authenticate', {
    userId: 'test-user-room-sync',
    username: 'RoomSyncTester',
    tag: '1001',
    avatar: 'avatar-cyber-ninja'
  });
  await initialRoomSync;

  const roomName = 'Regresyon Odası';
  const roomSync = waitForEvent(
    socket,
    'rooms-sync',
    ({ rooms }) => rooms.some(room => room.name === roomName)
  );

  socket.emit('create-room', {
    name: roomName,
    category: 'Custom',
    maxUsers: 5
  });

  const { rooms } = await roomSync;
  assert.ok(rooms.some(room => room.name === roomName));
  socket.disconnect();
});

test('relays a WebRTC offer to the addressed peer only', async () => {
  const caller = await connectClient();
  const callee = await connectClient();
  const bystander = await connectClient();

  await authenticate(caller, 'test-signal-caller', 'SignalCaller');
  const calleeId = await authenticate(callee, 'test-signal-callee', 'SignalCallee');
  await authenticate(bystander, 'test-signal-bystander', 'SignalBystander');

  const delivered = waitForEvent(callee, 'signal-offer');
  let leaked = false;
  bystander.on('signal-offer', () => { leaked = true; });

  caller.emit('signal-offer', {
    toUserId: calleeId,
    offer: { type: 'offer', sdp: 'v=0 regression' },
    roomId: 'room-under-test'
  });

  const payload = await delivered;
  assert.equal(payload.offer.sdp, 'v=0 regression');
  assert.equal(leaked, false, 'Teklif ilgisiz bir istemciye de gitti.');

  caller.disconnect();
  callee.disconnect();
  bystander.disconnect();
});

test('rejects a second session for an already connected identity', async () => {
  const first = await connectClient();
  await authenticate(first, 'test-duplicate-identity', 'DuplicateTester');

  const second = await connectClient();
  const rejection = waitForEvent(second, 'auth-error');
  second.emit('authenticate', {
    userId: 'test-duplicate-identity',
    username: 'DuplicateTester',
    tag: '1001'
  });

  const { reason } = await rejection;
  assert.equal(reason, 'already-connected');

  first.disconnect();
  second.disconnect();
});

test('serves the default STUN list when no TURN server is configured', async () => {
  const response = await fetch(`${openServer.url}/api/ice-servers`);
  assert.equal(response.status, 200);

  const { iceServers } = await response.json();
  assert.ok(iceServers.length > 0);
  assert.ok(iceServers.every(entry => !entry.credential), 'TURN tanımsızken kimlik bilgisi dönmemeli.');
});

test('advertises the configured TURN server to clients', async () => {
  const server = await startSignalingServer({
    BACOLAR_TURN_URLS: 'turn:turn.example.net:3478,turns:turn.example.net:5349',
    BACOLAR_TURN_USERNAME: 'regression',
    BACOLAR_TURN_CREDENTIAL: 'secret-credential'
  });

  try {
    const { iceServers } = await (await fetch(`${server.url}/api/ice-servers`)).json();
    const turn = iceServers.find(entry => entry.credential === 'secret-credential');

    assert.ok(turn, 'TURN girdisi ICE listesinde yok.');
    assert.deepEqual(turn.urls, ['turn:turn.example.net:3478', 'turns:turn.example.net:5349']);
    assert.equal(turn.username, 'regression');
  } finally {
    await stopSignalingServer(server);
  }
});

test('refuses sockets and REST calls that do not present the server token', async () => {
  const server = await startSignalingServer({ BACOLAR_SERVER_TOKEN: 'regression-token' });

  try {
    await assert.rejects(
      connectClient(server.url, 'wrong-token'),
      /invalid-server-token/,
      'Yanlış şifreyle bağlantı kabul edildi.'
    );

    const unauthorized = await fetch(`${server.url}/api/ice-servers`);
    assert.equal(unauthorized.status, 401);

    const authorized = await fetch(`${server.url}/api/ice-servers`, {
      headers: { 'x-bacolar-token': 'regression-token' }
    });
    assert.equal(authorized.status, 200);

    // Electron ana süreci portu kimin tuttuğunu token'sız anlayabilmeli.
    const health = await fetch(`${server.url}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).service, 'bacolarvoice-signaling');

    const accepted = await connectClient(server.url, 'regression-token');
    accepted.disconnect();
  } finally {
    await stopSignalingServer(server);
  }
});
