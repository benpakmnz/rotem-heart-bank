import { getIn, setIn, joinPath, pathsOverlap, toJsonValue } from './paths';

// Same-browser transport: every tab (TV + "phones") keeps a copy of the room
// tree and broadcasts its writes over a BroadcastChannel. Used for the demo
// mode when Firebase isn't configured, and for automated tests. Every path
// has a single writer (host: state, player: its own nodes), so tabs converge.

const SYNC_WAIT_MS = 800;
const hubs = new Map();

class LocalHub {
  constructor(code, authority) {
    this.code = code;
    this.tree = {};
    this.listeners = new Set();
    this.pending = [];
    this.disconnectWrites = new Map();
    this.synced = false;
    this.channel = new BroadcastChannel(`heartbank-room-${code}`);
    this.channel.onmessage = (e) => this.onMessage(e.data);
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    this.fallbackTree = null;
    // Ask the other tabs for the current tree. The TV tab is the authority:
    // it takes a snapshot if another tab has one (e.g. after a reload).
    this.channel.postMessage({ type: 'sync-request' });
    setTimeout(() => this.finishSync(this.fallbackTree), authority ? 250 : SYNC_WAIT_MS);
    window.addEventListener('pagehide', () => this.flushDisconnectWrites());
  }

  finishSync(tree) {
    if (this.synced) return;
    if (tree) this.tree = tree;
    this.pending.forEach((op) => this.apply(op, false));
    this.pending = [];
    this.synced = true;
    this.resolveReady();
    this.notify('');
  }

  onMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'sync-request') {
      if (this.synced) this.channel.postMessage({ type: 'snapshot', tree: this.tree, hasMeta: !!this.tree.meta });
    } else if (msg.type === 'snapshot') {
      if (this.synced) return;
      if (msg.hasMeta) this.finishSync(msg.tree);
      else if (!this.fallbackTree) this.fallbackTree = msg.tree;
    } else if (msg.type === 'op') {
      if (!this.synced) this.pending.push(msg.op);
      this.apply(msg.op, true);
    }
  }

  apply(op, notify) {
    if (op.t === 'update') {
      Object.keys(op.v || {}).forEach((key) => {
        this.tree = setIn(this.tree, joinPath(op.p, key), toJsonValue(op.v[key]));
      });
    } else {
      this.tree = setIn(this.tree, op.p, op.t === 'set' ? toJsonValue(op.v) : null);
    }
    if (notify) this.notify(op.p);
  }

  write(op) {
    if (!this.synced) this.pending.push(op); // replayed on top of the snapshot
    this.apply(op, true);
    this.channel.postMessage({ type: 'op', op });
    return Promise.resolve();
  }

  notify(changedPath) {
    if (!this.synced) return;
    this.listeners.forEach((l) => {
      if (!pathsOverlap(l.path, changedPath)) return;
      const value = getIn(this.tree, l.path);
      const json = JSON.stringify(value);
      if (json === l.last) return;
      l.last = json;
      l.cb(value == null ? null : JSON.parse(json));
    });
  }

  subscribe(path, cb) {
    const listener = { path, cb, last: undefined };
    this.listeners.add(listener);
    this.ready.then(() => {
      if (!this.listeners.has(listener) || listener.last !== undefined) return;
      const value = getIn(this.tree, path);
      listener.last = JSON.stringify(value);
      cb(value == null ? null : JSON.parse(listener.last));
    });
    return () => this.listeners.delete(listener);
  }

  flushDisconnectWrites() {
    this.disconnectWrites.forEach((value, path) => this.write({ t: 'set', p: path, v: value }));
  }
}

const hubFor = (code, authority) => {
  if (!hubs.has(code)) hubs.set(code, new LocalHub(code, authority));
  return hubs.get(code);
};

export const createLocalRoom = (code, { authority = false } = {}) => {
  const hub = hubFor(code, authority);
  const room = (path) => joinPath(path);
  return {
    kind: 'local',
    code,
    subscribe: (path, cb) => hub.subscribe(room(path), cb),
    get: async (path) => {
      await hub.ready;
      const value = getIn(hub.tree, room(path));
      return value == null ? null : JSON.parse(JSON.stringify(value));
    },
    set: (path, value) => hub.write({ t: 'set', p: room(path), v: toJsonValue(value) }),
    update: (path, patch) => hub.write({ t: 'update', p: room(path), v: toJsonValue(patch) }),
    remove: (path) => hub.write({ t: 'remove', p: room(path) }),
    serverNow: () => Date.now(),
    onConnection: (cb) => {
      cb(true);
      return () => {};
    },
    presence: (path) => {
      const p = room(path);
      hub.write({ t: 'set', p, v: true });
      hub.disconnectWrites.set(p, false);
      return () => hub.disconnectWrites.delete(p);
    },
  };
};
