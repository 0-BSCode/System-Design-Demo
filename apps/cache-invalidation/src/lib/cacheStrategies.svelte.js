/**
 * Cache invalidation strategy implementations using Svelte 5 runes.
 * Each returns a reactive object with read/write methods and visual state.
 */

const SEED_DATA = [
  { key: "user:1", value: "Alice" },
  { key: "user:2", value: "Bob" },
  { key: "product:10", value: "Widget" },
  { key: "product:20", value: "Gadget" },
  { key: "config:theme", value: "dark" },
  { key: "config:lang", value: "en" },
];

const SEED_KEYS = SEED_DATA.map((d) => d.key);

function addLog(log, entry) {
  return [entry, ...log].slice(0, 50);
}

/**
 * TTL Cache: entries expire after a time-to-live duration.
 */
export function createTtlCache(ttlMs = 5000, dbLatencyMs = 200) {
  let cache = $state([]);
  let db = $state(SEED_DATA.map((d) => ({ ...d })));
  let log = $state([]);
  let ttl = $state(ttlMs);
  let dbLatency = $state(dbLatencyMs);

  function isExpired(entry) {
    return Date.now() - entry.createdAt > entry.ttlMs;
  }

  async function read(key) {
    const now = Date.now();
    const cached = cache.find((e) => e.key === key && !isExpired(e));
    if (cached) {
      log = addLog(log, {
        id: crypto.randomUUID(),
        time: now,
        type: "READ",
        result: "HIT",
        key,
        value: cached.value,
      });
      return cached.value;
    }
    // Cache miss — fetch from DB
    await new Promise((r) => setTimeout(r, dbLatency));
    const dbEntry = db.find((e) => e.key === key);
    const value = dbEntry ? dbEntry.value : null;
    if (value !== null) {
      // Remove expired entry if present, add fresh one
      cache = [
        ...cache.filter((e) => e.key !== key),
        { key, value, createdAt: Date.now(), ttlMs: ttl },
      ];
    }
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "READ",
      result: "MISS",
      key,
      value,
      latency: dbLatency,
    });
    return value;
  }

  function write(key, value) {
    const now = Date.now();
    // Update DB
    db = db.map((e) => (e.key === key ? { ...e, value } : e));
    // Invalidate cache entry
    cache = cache.filter((e) => e.key !== key);
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "WRITE",
      result: "OK",
      key,
      value,
    });
  }

  function setTtl(ms) {
    ttl = ms;
  }

  function setDbLatency(ms) {
    dbLatency = ms;
  }

  function reset() {
    cache = [];
    db = SEED_DATA.map((d) => ({ ...d }));
    log = [];
  }

  return {
    get cache() {
      return cache;
    },
    get db() {
      return db;
    },
    get log() {
      return log;
    },
    get ttl() {
      return ttl;
    },
    get dbLatency() {
      return dbLatency;
    },
    get keys() {
      return SEED_KEYS;
    },
    isExpired,
    read,
    write,
    setTtl,
    setDbLatency,
    reset,
    destroy() {},
  };
}

/**
 * Write-Through Cache: writes go to both cache and DB synchronously.
 */
export function createWriteThroughCache(dbLatencyMs = 300) {
  let cache = $state([]);
  let db = $state(SEED_DATA.map((d) => ({ ...d })));
  let log = $state([]);
  let dbLatency = $state(dbLatencyMs);
  let pendingOps = $state([]);

  async function read(key) {
    const now = Date.now();
    const cached = cache.find((e) => e.key === key);
    if (cached) {
      log = addLog(log, {
        id: crypto.randomUUID(),
        time: now,
        type: "READ",
        result: "HIT",
        key,
        value: cached.value,
      });
      return cached.value;
    }
    // Cache miss — fetch from DB with latency
    await new Promise((r) => setTimeout(r, dbLatency));
    const dbEntry = db.find((e) => e.key === key);
    const value = dbEntry ? dbEntry.value : null;
    if (value !== null) {
      cache = [...cache, { key, value }];
    }
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "READ",
      result: "MISS",
      key,
      value,
      latency: dbLatency,
    });
    return value;
  }

  async function write(key, value) {
    const now = Date.now();
    const opId = crypto.randomUUID();
    pendingOps = [...pendingOps, { id: opId, key }];

    // Update cache immediately
    const existing = cache.find((e) => e.key === key);
    if (existing) {
      cache = cache.map((e) => (e.key === key ? { ...e, value } : e));
    } else {
      cache = [...cache, { key, value }];
    }

    // Simulate DB write latency
    await new Promise((r) => setTimeout(r, dbLatency));

    // Update DB
    db = db.map((e) => (e.key === key ? { ...e, value } : e));
    pendingOps = pendingOps.filter((op) => op.id !== opId);

    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "WRITE",
      result: "OK",
      key,
      value,
      latency: dbLatency,
    });
  }

  function setLatency(ms) {
    dbLatency = ms;
  }

  function reset() {
    cache = [];
    db = SEED_DATA.map((d) => ({ ...d }));
    log = [];
    pendingOps = [];
  }

  return {
    get cache() {
      return cache;
    },
    get db() {
      return db;
    },
    get log() {
      return log;
    },
    get dbLatency() {
      return dbLatency;
    },
    get pendingOps() {
      return pendingOps;
    },
    get keys() {
      return SEED_KEYS;
    },
    read,
    write,
    setLatency,
    reset,
    destroy() {},
  };
}

/**
 * Write-Behind Cache: writes go to cache immediately, DB updated asynchronously in batches.
 */
export function createWriteBehindCache(flushIntervalMs = 3000, dbLatencyMs = 500) {
  let cache = $state([]);
  let db = $state(SEED_DATA.map((d) => ({ ...d })));
  let log = $state([]);
  let dirtyQueue = $state([]);
  let isFlushing = $state(false);
  let crashed = $state(false);
  let flushInterval = $state(flushIntervalMs);
  let dbLatency = $state(dbLatencyMs);
  let intervalId = null;

  function startFlushTimer() {
    stopFlushTimer();
    intervalId = setInterval(() => {
      if (dirtyQueue.length > 0 && !isFlushing && !crashed) {
        flush();
      }
    }, flushInterval);
  }

  function stopFlushTimer() {
    if (intervalId) clearInterval(intervalId);
  }

  function read(key) {
    const now = Date.now();
    const cached = cache.find((e) => e.key === key);
    if (cached) {
      log = addLog(log, {
        id: crypto.randomUUID(),
        time: now,
        type: "READ",
        result: "HIT",
        key,
        value: cached.value,
      });
      return cached.value;
    }
    const dbEntry = db.find((e) => e.key === key);
    const value = dbEntry ? dbEntry.value : null;
    if (value !== null) {
      cache = [...cache, { key, value }];
    }
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "READ",
      result: "MISS",
      key,
      value,
    });
    return value;
  }

  function write(key, value) {
    const now = Date.now();
    if (crashed) return;

    // Update cache immediately
    const existing = cache.find((e) => e.key === key);
    if (existing) {
      cache = cache.map((e) => (e.key === key ? { ...e, value } : e));
    } else {
      cache = [...cache, { key, value }];
    }

    // Add to dirty queue
    dirtyQueue = [...dirtyQueue.filter((e) => e.key !== key), { key, value, queuedAt: now }];

    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "WRITE",
      result: "OK",
      key,
      value,
      queued: true,
    });
  }

  async function flush() {
    if (dirtyQueue.length === 0 || isFlushing || crashed) return;
    isFlushing = true;
    const toFlush = [...dirtyQueue];
    const now = Date.now();

    await new Promise((r) => setTimeout(r, dbLatency));

    if (crashed) {
      isFlushing = false;
      return;
    }

    // Apply dirty writes to DB
    let newDb = [...db];
    for (const entry of toFlush) {
      newDb = newDb.map((e) => (e.key === entry.key ? { ...e, value: entry.value } : e));
    }
    db = newDb;

    // Remove flushed entries from queue
    const flushedKeys = new Set(toFlush.map((e) => e.key));
    dirtyQueue = dirtyQueue.filter((e) => !flushedKeys.has(e.key));
    isFlushing = false;

    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "FLUSH",
      result: "OK",
      key: `${toFlush.length} entries`,
      value: null,
    });
  }

  function simulateCrash() {
    const now = Date.now();
    crashed = true;
    stopFlushTimer();
    const lostCount = dirtyQueue.length;
    // Cache is in-memory — crash wipes it entirely along with the dirty queue
    dirtyQueue = [];
    cache = [];

    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "CRASH",
      result: "LOST",
      key: `${lostCount} dirty writes`,
      value: null,
    });
  }

  function recover() {
    crashed = false;
    startFlushTimer();
  }

  function setFlushInterval(ms) {
    flushInterval = ms;
    if (!crashed) startFlushTimer();
  }

  function setDbLatency(ms) {
    dbLatency = ms;
  }

  function reset() {
    stopFlushTimer();
    cache = [];
    db = SEED_DATA.map((d) => ({ ...d }));
    log = [];
    dirtyQueue = [];
    isFlushing = false;
    crashed = false;
    startFlushTimer();
  }

  startFlushTimer();

  return {
    get cache() {
      return cache;
    },
    get db() {
      return db;
    },
    get log() {
      return log;
    },
    get dirtyQueue() {
      return dirtyQueue;
    },
    get isFlushing() {
      return isFlushing;
    },
    get crashed() {
      return crashed;
    },
    get flushInterval() {
      return flushInterval;
    },
    get dbLatency() {
      return dbLatency;
    },
    get keys() {
      return SEED_KEYS;
    },
    read,
    write,
    flush,
    simulateCrash,
    recover,
    setFlushInterval,
    setDbLatency,
    reset,
    destroy: stopFlushTimer,
  };
}

/**
 * Tagged Cache: entries have tags, invalidating a tag removes all matching entries.
 */
export function createTaggedCache() {
  const TAG_MAP = {
    "user:1": ["users", "profiles"],
    "user:2": ["users", "profiles"],
    "product:10": ["products", "catalog"],
    "product:20": ["products", "catalog"],
    "config:theme": ["config", "ui"],
    "config:lang": ["config", "i18n"],
  };

  const ALL_TAGS = ["users", "profiles", "products", "catalog", "config", "ui", "i18n"];

  let cache = $state([]);
  let db = $state(SEED_DATA.map((d) => ({ ...d })));
  let log = $state([]);

  function read(key) {
    const now = Date.now();
    const cached = cache.find((e) => e.key === key);
    if (cached) {
      log = addLog(log, {
        id: crypto.randomUUID(),
        time: now,
        type: "READ",
        result: "HIT",
        key,
        value: cached.value,
      });
      return cached.value;
    }
    const dbEntry = db.find((e) => e.key === key);
    const value = dbEntry ? dbEntry.value : null;
    const tags = TAG_MAP[key] || [];
    if (value !== null) {
      cache = [...cache, { key, value, tags }];
    }
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "READ",
      result: "MISS",
      key,
      value,
    });
    return value;
  }

  function write(key, value, tags) {
    const now = Date.now();
    const entryTags = tags || TAG_MAP[key] || [];
    // Update DB
    db = db.map((e) => (e.key === key ? { ...e, value } : e));
    // Update or add to cache
    const existing = cache.find((e) => e.key === key);
    if (existing) {
      cache = cache.map((e) => (e.key === key ? { ...e, value, tags: entryTags } : e));
    } else {
      cache = [...cache, { key, value, tags: entryTags }];
    }
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "WRITE",
      result: "OK",
      key,
      value,
    });
  }

  function invalidateTag(tag) {
    const now = Date.now();
    const removed = cache.filter((e) => e.tags.includes(tag));
    cache = cache.filter((e) => !e.tags.includes(tag));
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "INVALIDATE",
      result: "OK",
      key: `tag:${tag}`,
      value: `${removed.length} entries`,
    });
  }

  function reset() {
    cache = [];
    db = SEED_DATA.map((d) => ({ ...d }));
    log = [];
  }

  return {
    get cache() {
      return cache;
    },
    get db() {
      return db;
    },
    get log() {
      return log;
    },
    get keys() {
      return SEED_KEYS;
    },
    get allTags() {
      return ALL_TAGS;
    },
    get tagMap() {
      return TAG_MAP;
    },
    read,
    write,
    invalidateTag,
    reset,
    destroy() {},
  };
}

/**
 * Versioned Cache: entries are stamped with a version, bumping orphans all old entries.
 */
export function createVersionedCache(initialVersion = 1) {
  let cache = $state([]);
  let db = $state(SEED_DATA.map((d) => ({ ...d })));
  let log = $state([]);
  let currentVersion = $state(initialVersion);

  function read(key) {
    const now = Date.now();
    const cached = cache.find((e) => e.key === key && e.version === currentVersion);
    if (cached) {
      log = addLog(log, {
        id: crypto.randomUUID(),
        time: now,
        type: "READ",
        result: "HIT",
        key,
        value: cached.value,
        version: currentVersion,
      });
      return cached.value;
    }
    // Check for stale version
    const stale = cache.find((e) => e.key === key && e.version !== currentVersion);
    const dbEntry = db.find((e) => e.key === key);
    const value = dbEntry ? dbEntry.value : null;
    if (value !== null) {
      // Remove stale, add current version
      cache = [...cache.filter((e) => e.key !== key), { key, value, version: currentVersion }];
    }
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "READ",
      result: stale ? "STALE" : "MISS",
      key,
      value,
      version: currentVersion,
    });
    return value;
  }

  function write(key, value) {
    const now = Date.now();
    db = db.map((e) => (e.key === key ? { ...e, value } : e));
    const existing = cache.find((e) => e.key === key && e.version === currentVersion);
    if (existing) {
      cache = cache.map((e) =>
        e.key === key && e.version === currentVersion ? { ...e, value } : e,
      );
    } else {
      cache = [...cache.filter((e) => e.key !== key), { key, value, version: currentVersion }];
    }
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "WRITE",
      result: "OK",
      key,
      value,
      version: currentVersion,
    });
  }

  function bumpVersion() {
    const now = Date.now();
    currentVersion++;
    log = addLog(log, {
      id: crypto.randomUUID(),
      time: now,
      type: "BUMP",
      result: "OK",
      key: `v${currentVersion}`,
      value: `${cache.length} entries orphaned`,
    });
  }

  function reset() {
    cache = [];
    db = SEED_DATA.map((d) => ({ ...d }));
    log = [];
    currentVersion = 1;
  }

  return {
    get cache() {
      return cache;
    },
    get db() {
      return db;
    },
    get log() {
      return log;
    },
    get currentVersion() {
      return currentVersion;
    },
    get keys() {
      return SEED_KEYS;
    },
    read,
    write,
    bumpVersion,
    reset,
    destroy() {},
  };
}
