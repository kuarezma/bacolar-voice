import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';

let signalingProcess;
let serverUrl;
let dataFilePath;

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

async function connectClient() {
  const socket = io(serverUrl, {
    autoConnect: false,
    reconnection: false,
    transports: ['websocket']
  });

  const connected = waitForEvent(socket, 'connect');
  socket.connect();
  await connected;
  return socket;
}

before(async () => {
  const port = await getOpenPort();
  serverUrl = `http://127.0.0.1:${port}`;
  dataFilePath = path.join(os.tmpdir(), `nexus-voice-test-${process.pid}-${Date.now()}.json`);

  signalingProcess = spawn(process.execPath, ['dist/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NEXUS_DATA_FILE: dataFilePath
    },
    stdio: 'ignore'
  });

  await waitForHealthCheck(serverUrl);
});

after(async () => {
  if (signalingProcess && signalingProcess.exitCode === null) {
    const exited = once(signalingProcess, 'exit');
    signalingProcess.kill();
    await exited;
  }
  await rm(dataFilePath, { force: true });
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
