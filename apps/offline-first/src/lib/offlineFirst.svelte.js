/**
 * Offline-First pattern implementations using Svelte 5 runes.
 * Three patterns: Sync Queue, Conflict Resolution, Cache Strategies.
 */

let nextId = 1;
function uid(prefix = "item") {
  return `${prefix}-${nextId++}`;
}

// ── 1. Sync Queue (Local-First + Background Sync) ────────

export function createSyncQueue() {
  let localItems = $state([]);
  let mutationQueue = $state([]);
  let serverItems = $state([]);
  let isOnline = $state(true);
  let syncing = $state(null);
  let log = $state([]);
  let syncedCount = $state(0);
  let failedCount = $state(0);
  let draining = false;
  let drainTimeout = null;

  function addLog(message, type = "info") {
    log = [{ id: uid("log"), message, type, time: Date.now() }, ...log].slice(0, 80);
  }

  function addNote(text) {
    const id = uid("note");
    const note = { id, text, createdAt: Date.now(), updatedAt: Date.now() };
    localItems = [...localItems, note];
    mutationQueue = [
      ...mutationQueue,
      {
        id: uid("mut"),
        type: "create",
        payload: { ...note },
        status: "pending",
        createdAt: Date.now(),
      },
    ];
    addLog(`Created note: "${text}"`, "create");
    tryDrain();
  }

  function editNote(noteId, text) {
    localItems = localItems.map((n) =>
      n.id === noteId ? { ...n, text, updatedAt: Date.now() } : n,
    );
    mutationQueue = [
      ...mutationQueue,
      {
        id: uid("mut"),
        type: "update",
        payload: { id: noteId, text, updatedAt: Date.now() },
        status: "pending",
        createdAt: Date.now(),
      },
    ];
    addLog(`Edited note: "${text}"`, "update");
    tryDrain();
  }

  function deleteNote(noteId) {
    const note = localItems.find((n) => n.id === noteId);
    localItems = localItems.filter((n) => n.id !== noteId);
    mutationQueue = [
      ...mutationQueue,
      {
        id: uid("mut"),
        type: "delete",
        payload: { id: noteId },
        status: "pending",
        createdAt: Date.now(),
      },
    ];
    addLog(`Deleted note: "${note?.text || noteId}"`, "delete");
    tryDrain();
  }

  function tryDrain() {
    if (isOnline && mutationQueue.length > 0 && !draining) {
      drainQueue();
    }
  }

  function drainQueue() {
    if (!isOnline || mutationQueue.length === 0 || draining) return;
    draining = true;
    drainNext();
  }

  function drainNext() {
    const pending = mutationQueue.filter((m) => m.status === "pending");
    if (pending.length === 0 || !isOnline) {
      draining = false;
      syncing = null;
      return;
    }

    const mutation = pending[0];
    syncing = mutation.id;
    mutationQueue = mutationQueue.map((m) =>
      m.id === mutation.id ? { ...m, status: "syncing" } : m,
    );

    addLog(`Syncing ${mutation.type}: ${mutation.payload.text || mutation.payload.id}`, "sync");

    drainTimeout = setTimeout(() => {
      // Simulate occasional failure (5% chance)
      const didFail = Math.random() < 0.05;

      if (didFail) {
        mutationQueue = mutationQueue.map((m) =>
          m.id === mutation.id ? { ...m, status: "failed" } : m,
        );
        failedCount++;
        addLog(`Sync failed: ${mutation.type}`, "fail");
      } else {
        // Apply to server
        applyToServer(mutation);
        mutationQueue = mutationQueue.filter((m) => m.id !== mutation.id);
        syncedCount++;
        addLog(`Synced ${mutation.type} to server`, "complete");
      }

      syncing = null;
      // Continue draining
      drainTimeout = setTimeout(drainNext, 200);
    }, 600);
  }

  function applyToServer(mutation) {
    switch (mutation.type) {
      case "create":
        serverItems = [...serverItems, { ...mutation.payload }];
        break;
      case "update": {
        const exists = serverItems.some((s) => s.id === mutation.payload.id);
        if (exists) {
          serverItems = serverItems.map((s) =>
            s.id === mutation.payload.id
              ? { ...s, text: mutation.payload.text, updatedAt: mutation.payload.updatedAt }
              : s,
          );
        }
        break;
      }
      case "delete":
        serverItems = serverItems.filter((s) => s.id !== mutation.payload.id);
        break;
    }
  }

  function toggleOnline() {
    isOnline = !isOnline;
    if (isOnline) {
      addLog("Back online — starting sync", "online");
      // Retry failed mutations
      mutationQueue = mutationQueue.map((m) =>
        m.status === "failed" ? { ...m, status: "pending" } : m,
      );
      tryDrain();
    } else {
      addLog("Gone offline — mutations will queue", "offline");
      draining = false;
      syncing = null;
      if (drainTimeout) clearTimeout(drainTimeout);
    }
  }

  function reset() {
    if (drainTimeout) clearTimeout(drainTimeout);
    draining = false;
    localItems = [];
    mutationQueue = [];
    serverItems = [];
    isOnline = true;
    syncing = null;
    syncedCount = 0;
    failedCount = 0;
    log = [];
  }

  function destroy() {
    if (drainTimeout) clearTimeout(drainTimeout);
  }

  return {
    get localItems() {
      return localItems;
    },
    get mutationQueue() {
      return mutationQueue;
    },
    get serverItems() {
      return serverItems;
    },
    get isOnline() {
      return isOnline;
    },
    get syncing() {
      return syncing;
    },
    get log() {
      return log;
    },
    get syncedCount() {
      return syncedCount;
    },
    get failedCount() {
      return failedCount;
    },
    addNote,
    editNote,
    deleteNote,
    toggleOnline,
    reset,
    destroy,
  };
}

// ── 2. Conflict Resolution (LWW vs CRDT) ─────────────────

export function createConflictResolver() {
  const INITIAL_DOC = {
    title: "Shopping List",
    item1: "Milk",
    item2: "Eggs",
    item3: "Bread",
  };

  let serverDoc = $state({ ...INITIAL_DOC });
  let clientA = $state({
    doc: { ...INITIAL_DOC },
    online: true,
    pendingEdits: [],
    clock: { A: 0, B: 0 },
    label: "Client A",
  });
  let clientB = $state({
    doc: { ...INITIAL_DOC },
    online: true,
    pendingEdits: [],
    clock: { A: 0, B: 0 },
    label: "Client B",
  });
  let strategy = $state("lww");
  let conflicts = $state([]);
  let log = $state([]);
  let resolvedCount = $state(0);

  function addLog(message, type = "info") {
    log = [{ id: uid("log"), message, type, time: Date.now() }, ...log].slice(0, 80);
  }

  function editClient(clientId, key, value) {
    if (clientId === "A") {
      clientA = {
        ...clientA,
        doc: { ...clientA.doc, [key]: value },
        clock: { ...clientA.clock, A: clientA.clock.A + 1 },
        pendingEdits: [
          ...clientA.pendingEdits,
          {
            id: uid("edit"),
            key,
            value,
            timestamp: Date.now(),
            clock: { ...clientA.clock, A: clientA.clock.A + 1 },
            origin: "A",
          },
        ],
      };
      addLog(`Client A edited ${key} = "${value}"`, "edit-a");
    } else {
      clientB = {
        ...clientB,
        doc: { ...clientB.doc, [key]: value },
        clock: { ...clientB.clock, B: clientB.clock.B + 1 },
        pendingEdits: [
          ...clientB.pendingEdits,
          {
            id: uid("edit"),
            key,
            value,
            timestamp: Date.now(),
            clock: { ...clientB.clock, B: clientB.clock.B + 1 },
            origin: "B",
          },
        ],
      };
      addLog(`Client B edited ${key} = "${value}"`, "edit-b");
    }
  }

  function syncClient(clientId) {
    const client = clientId === "A" ? clientA : clientB;
    const otherClient = clientId === "A" ? clientB : clientA;

    if (client.pendingEdits.length === 0) {
      addLog(`${client.label} has nothing to sync`, "info");
      return;
    }

    addLog(`${client.label} syncing ${client.pendingEdits.length} edit(s)...`, "sync");

    const newConflicts = [];

    for (const edit of client.pendingEdits) {
      // Check if the other client also edited this key
      const conflicting = otherClient.pendingEdits.find((e) => e.key === edit.key);

      if (conflicting) {
        // Conflict detected
        const resolution = resolveConflict(edit, conflicting);
        newConflicts.push({
          id: uid("conflict"),
          key: edit.key,
          editA: clientId === "A" ? edit : conflicting,
          editB: clientId === "A" ? conflicting : edit,
          winner: resolution.winner,
          resolvedValue: resolution.value,
          strategy,
        });
        serverDoc = { ...serverDoc, [edit.key]: resolution.value };
        resolvedCount++;
        addLog(
          `Conflict on "${edit.key}": ${resolution.winner} wins (${strategy.toUpperCase()})`,
          "conflict",
        );
      } else {
        // No conflict, apply directly
        serverDoc = { ...serverDoc, [edit.key]: edit.value };
        addLog(`Applied ${client.label}'s edit: ${edit.key} = "${edit.value}"`, "complete");
      }
    }

    // Clear pending edits for this client
    if (clientId === "A") {
      clientA = {
        ...clientA,
        pendingEdits: [],
        doc: { ...serverDoc },
        clock: mergeClock(clientA.clock, clientB.clock),
      };
    } else {
      clientB = {
        ...clientB,
        pendingEdits: [],
        doc: { ...serverDoc },
        clock: mergeClock(clientB.clock, clientA.clock),
      };
    }

    conflicts = [...newConflicts, ...conflicts].slice(0, 20);
  }

  function resolveConflict(editA, editB) {
    if (strategy === "lww") {
      // Last-Write-Wins: highest timestamp wins
      if (editA.timestamp >= editB.timestamp) {
        return { winner: editA.origin === "A" ? "Client A" : "Client B", value: editA.value };
      }
      return { winner: editB.origin === "A" ? "Client A" : "Client B", value: editB.value };
    }
    // CRDT LWW-Register: compare vector clocks, if concurrent use replica ID tiebreak
    const aSum = editA.clock.A + editA.clock.B;
    const bSum = editB.clock.A + editB.clock.B;
    if (aSum !== bSum) {
      if (aSum > bSum) {
        return { winner: editA.origin === "A" ? "Client A" : "Client B", value: editA.value };
      }
      return { winner: editB.origin === "A" ? "Client A" : "Client B", value: editB.value };
    }
    // Concurrent: tiebreak by replica ID (B > A)
    if (editB.origin === "B") {
      return { winner: "Client B", value: editB.value };
    }
    return { winner: "Client A", value: editA.value };
  }

  function mergeClock(clockA, clockB) {
    return {
      A: Math.max(clockA.A, clockB.A),
      B: Math.max(clockA.B, clockB.B),
    };
  }

  function toggleClient(clientId) {
    if (clientId === "A") {
      clientA = { ...clientA, online: !clientA.online };
      addLog(
        `Client A is now ${clientA.online ? "online" : "offline"}`,
        clientA.online ? "online" : "offline",
      );
    } else {
      clientB = { ...clientB, online: !clientB.online };
      addLog(
        `Client B is now ${clientB.online ? "online" : "offline"}`,
        clientB.online ? "online" : "offline",
      );
    }
  }

  function setStrategy(s) {
    strategy = s;
    addLog(`Strategy changed to ${s.toUpperCase()}`, "info");
  }

  function reset() {
    serverDoc = { ...INITIAL_DOC };
    clientA = {
      doc: { ...INITIAL_DOC },
      online: true,
      pendingEdits: [],
      clock: { A: 0, B: 0 },
      label: "Client A",
    };
    clientB = {
      doc: { ...INITIAL_DOC },
      online: true,
      pendingEdits: [],
      clock: { A: 0, B: 0 },
      label: "Client B",
    };
    conflicts = [];
    resolvedCount = 0;
    log = [];
  }

  function destroy() {}

  return {
    get serverDoc() {
      return serverDoc;
    },
    get clientA() {
      return clientA;
    },
    get clientB() {
      return clientB;
    },
    get strategy() {
      return strategy;
    },
    get conflicts() {
      return conflicts;
    },
    get log() {
      return log;
    },
    get resolvedCount() {
      return resolvedCount;
    },
    get docKeys() {
      return Object.keys(INITIAL_DOC);
    },
    editClient,
    syncClient,
    toggleClient,
    setStrategy,
    reset,
    destroy,
  };
}

// ── 3. Cache Strategies (Service Worker Simulation) ───────

const RESOURCES = [
  { url: "/api/users", label: "Users API", color: "#3b82f6", ttl: 10000 },
  { url: "/api/products", label: "Products API", color: "#8b5cf6", ttl: 8000 },
  { url: "/static/styles.css", label: "Stylesheet", color: "#10b981", ttl: 30000 },
  { url: "/api/feed", label: "Feed API", color: "#f59e0b", ttl: 5000 },
];

export function createCacheStrategy() {
  let cache = $state({});
  let requests = $state([]);
  let strategy = $state("cache-first");
  let isOnline = $state(true);
  let latency = $state(500);
  let animating = $state(null);
  let log = $state([]);
  let cacheHits = $state(0);
  let networkHits = $state(0);
  let staleServes = $state(0);
  let totalLatency = $state(0);
  let requestCount = $state(0);
  let timeouts = [];

  // Tick TTL every second
  const ttlInterval = setInterval(() => {
    const now = Date.now();
    const newCache = {};
    for (const [url, entry] of Object.entries(cache)) {
      const age = now - entry.cachedAt;
      const remaining = entry.ttl - age;
      if (remaining > 0) {
        newCache[url] = { ...entry, remaining };
      }
    }
    cache = newCache;
  }, 1000);

  function addLog(message, type = "info") {
    log = [{ id: uid("log"), message, type, time: Date.now() }, ...log].slice(0, 80);
  }

  function generateData(url) {
    const fragments = ["alpha", "beta", "gamma", "delta", "omega", "sigma"];
    return `${url.split("/").pop()}_${fragments[Math.floor(Math.random() * fragments.length)]}_${Date.now().toString(36).slice(-4)}`;
  }

  function isCacheValid(url) {
    const entry = cache[url];
    if (!entry) return false;
    return Date.now() - entry.cachedAt < entry.ttl;
  }

  function isCacheStale(url) {
    const entry = cache[url];
    if (!entry) return false;
    return Date.now() - entry.cachedAt >= entry.ttl;
  }

  async function fetchResource(url) {
    if (animating) return; // Prevent concurrent fetches for clarity

    const resource = RESOURCES.find((r) => r.url === url);
    if (!resource) return;

    const reqId = uid("req");
    const startTime = Date.now();

    if (strategy === "cache-first") {
      await doCacheFirst(reqId, url, resource, startTime);
    } else if (strategy === "network-first") {
      await doNetworkFirst(reqId, url, resource, startTime);
    } else {
      await doStaleWhileRevalidate(reqId, url, resource, startTime);
    }
  }

  function delay(ms) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      timeouts.push(t);
    });
  }

  async function doCacheFirst(reqId, url, resource, startTime) {
    // Step 1: check cache
    animating = { reqId, step: "check-cache", url, strategy: "cache-first" };
    addLog(`[Cache-First] ${resource.label}: checking cache...`, "cache-check");
    await delay(200);

    if (isCacheValid(url)) {
      // Cache hit
      cacheHits++;
      const elapsed = Date.now() - startTime;
      totalLatency += elapsed;
      requestCount++;
      animating = { reqId, step: "cache-hit", url, strategy: "cache-first" };
      addLog(`[Cache-First] ${resource.label}: cache HIT (${elapsed}ms)`, "cache-hit");
      requests = [
        { id: reqId, url, source: "cache", latency: elapsed, time: Date.now() },
        ...requests,
      ].slice(0, 20);
      await delay(400);
      animating = null;
      return;
    }

    // Cache miss — go to network
    animating = { reqId, step: "network-fetch", url, strategy: "cache-first" };
    addLog(`[Cache-First] ${resource.label}: cache MISS, fetching from network...`, "network");

    if (!isOnline) {
      animating = { reqId, step: "network-fail", url, strategy: "cache-first" };
      addLog(`[Cache-First] ${resource.label}: network FAILED (offline)`, "fail");
      const elapsed = Date.now() - startTime;
      totalLatency += elapsed;
      requestCount++;
      requests = [
        { id: reqId, url, source: "failed", latency: elapsed, time: Date.now() },
        ...requests,
      ].slice(0, 20);
      await delay(400);
      animating = null;
      return;
    }

    await delay(latency);
    const data = generateData(url);
    cache = {
      ...cache,
      [url]: { data, cachedAt: Date.now(), ttl: resource.ttl, remaining: resource.ttl },
    };
    networkHits++;
    const elapsed = Date.now() - startTime;
    totalLatency += elapsed;
    requestCount++;
    animating = { reqId, step: "network-success", url, strategy: "cache-first" };
    addLog(`[Cache-First] ${resource.label}: network OK, cached (${elapsed}ms)`, "complete");
    requests = [
      { id: reqId, url, source: "network", latency: elapsed, time: Date.now() },
      ...requests,
    ].slice(0, 20);
    await delay(400);
    animating = null;
  }

  async function doNetworkFirst(reqId, url, resource, startTime) {
    // Step 1: try network
    animating = { reqId, step: "network-fetch", url, strategy: "network-first" };
    addLog(`[Network-First] ${resource.label}: fetching from network...`, "network");

    if (isOnline) {
      await delay(latency);
      const data = generateData(url);
      cache = {
        ...cache,
        [url]: { data, cachedAt: Date.now(), ttl: resource.ttl, remaining: resource.ttl },
      };
      networkHits++;
      const elapsed = Date.now() - startTime;
      totalLatency += elapsed;
      requestCount++;
      animating = { reqId, step: "network-success", url, strategy: "network-first" };
      addLog(`[Network-First] ${resource.label}: network OK, cached (${elapsed}ms)`, "complete");
      requests = [
        { id: reqId, url, source: "network", latency: elapsed, time: Date.now() },
        ...requests,
      ].slice(0, 20);
      await delay(400);
      animating = null;
      return;
    }

    // Network failed — try cache
    addLog(`[Network-First] ${resource.label}: network FAILED, checking cache...`, "fail");
    animating = { reqId, step: "check-cache", url, strategy: "network-first" };
    await delay(200);

    if (cache[url]) {
      cacheHits++;
      const elapsed = Date.now() - startTime;
      totalLatency += elapsed;
      requestCount++;
      animating = { reqId, step: "cache-hit", url, strategy: "network-first" };
      addLog(`[Network-First] ${resource.label}: cache fallback (${elapsed}ms)`, "cache-hit");
      requests = [
        { id: reqId, url, source: "cache", latency: elapsed, time: Date.now() },
        ...requests,
      ].slice(0, 20);
      await delay(400);
      animating = null;
      return;
    }

    const elapsed = Date.now() - startTime;
    totalLatency += elapsed;
    requestCount++;
    animating = { reqId, step: "network-fail", url, strategy: "network-first" };
    addLog(`[Network-First] ${resource.label}: no cache, FAILED (${elapsed}ms)`, "fail");
    requests = [
      { id: reqId, url, source: "failed", latency: elapsed, time: Date.now() },
      ...requests,
    ].slice(0, 20);
    await delay(400);
    animating = null;
  }

  async function doStaleWhileRevalidate(reqId, url, resource, startTime) {
    // Step 1: check cache (even stale)
    animating = { reqId, step: "check-cache", url, strategy: "swr" };
    addLog(`[SWR] ${resource.label}: checking cache...`, "cache-check");
    await delay(200);

    const hasCache = cache[url] != null;
    const isStale = isCacheStale(url);

    if (hasCache) {
      // Return cached data immediately
      cacheHits++;
      if (isStale) staleServes++;
      const elapsed = Date.now() - startTime;
      totalLatency += elapsed;
      requestCount++;
      animating = { reqId, step: isStale ? "cache-stale" : "cache-hit", url, strategy: "swr" };
      addLog(
        `[SWR] ${resource.label}: served from cache${isStale ? " (STALE)" : ""} (${elapsed}ms)`,
        isStale ? "stale" : "cache-hit",
      );
      requests = [
        {
          id: reqId,
          url,
          source: isStale ? "stale-cache" : "cache",
          latency: elapsed,
          time: Date.now(),
        },
        ...requests,
      ].slice(0, 20);

      // Background revalidate
      if (isOnline) {
        addLog(`[SWR] ${resource.label}: revalidating in background...`, "network");
        await delay(400);
        animating = { reqId, step: "background-revalidate", url, strategy: "swr" };
        await delay(latency);
        const data = generateData(url);
        cache = {
          ...cache,
          [url]: { data, cachedAt: Date.now(), ttl: resource.ttl, remaining: resource.ttl },
        };
        networkHits++;
        addLog(`[SWR] ${resource.label}: cache updated in background`, "complete");
      }

      await delay(300);
      animating = null;
      return;
    }

    // No cache at all — must go to network
    animating = { reqId, step: "network-fetch", url, strategy: "swr" };
    addLog(`[SWR] ${resource.label}: no cache, fetching network...`, "network");

    if (!isOnline) {
      const elapsed = Date.now() - startTime;
      totalLatency += elapsed;
      requestCount++;
      animating = { reqId, step: "network-fail", url, strategy: "swr" };
      addLog(`[SWR] ${resource.label}: FAILED (offline, no cache)`, "fail");
      requests = [
        { id: reqId, url, source: "failed", latency: elapsed, time: Date.now() },
        ...requests,
      ].slice(0, 20);
      await delay(400);
      animating = null;
      return;
    }

    await delay(latency);
    const data = generateData(url);
    cache = {
      ...cache,
      [url]: { data, cachedAt: Date.now(), ttl: resource.ttl, remaining: resource.ttl },
    };
    networkHits++;
    const elapsed = Date.now() - startTime;
    totalLatency += elapsed;
    requestCount++;
    animating = { reqId, step: "network-success", url, strategy: "swr" };
    addLog(`[SWR] ${resource.label}: fetched & cached (${elapsed}ms)`, "complete");
    requests = [
      { id: reqId, url, source: "network", latency: elapsed, time: Date.now() },
      ...requests,
    ].slice(0, 20);
    await delay(400);
    animating = null;
  }

  function setStrategy(s) {
    strategy = s;
    addLog(`Strategy: ${s}`, "info");
  }

  function toggleOnline() {
    isOnline = !isOnline;
    addLog(isOnline ? "Network: Online" : "Network: Offline", isOnline ? "online" : "offline");
  }

  function setLatency(ms) {
    latency = ms;
  }

  function clearCache() {
    cache = {};
    addLog("Cache cleared", "delete");
  }

  function reset() {
    for (const t of timeouts) clearTimeout(t);
    timeouts = [];
    cache = {};
    requests = [];
    isOnline = true;
    latency = 500;
    animating = null;
    cacheHits = 0;
    networkHits = 0;
    staleServes = 0;
    totalLatency = 0;
    requestCount = 0;
    log = [];
  }

  function destroy() {
    for (const t of timeouts) clearTimeout(t);
    clearInterval(ttlInterval);
  }

  return {
    get cache() {
      return cache;
    },
    get requests() {
      return requests;
    },
    get strategy() {
      return strategy;
    },
    get isOnline() {
      return isOnline;
    },
    get latency() {
      return latency;
    },
    get animating() {
      return animating;
    },
    get log() {
      return log;
    },
    get cacheHits() {
      return cacheHits;
    },
    get networkHits() {
      return networkHits;
    },
    get staleServes() {
      return staleServes;
    },
    get avgLatency() {
      return requestCount > 0 ? Math.round(totalLatency / requestCount) : 0;
    },
    get resources() {
      return RESOURCES;
    },
    fetchResource,
    setStrategy,
    toggleOnline,
    setLatency,
    clearCache,
    reset,
    destroy,
  };
}
