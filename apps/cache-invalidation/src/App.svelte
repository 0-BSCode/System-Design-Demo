<script>
import { AppNav } from "@rate-limiter/ui";
import { onDestroy } from "svelte";
import {
  createTaggedCache,
  createTtlCache,
  createVersionedCache,
  createWriteBehindCache,
  createWriteThroughCache,
} from "./lib/cacheStrategies.svelte.js";
import RequestLog from "./lib/RequestLog.svelte";
import TaggedViz from "./lib/TaggedViz.svelte";
import TtlViz from "./lib/TtlViz.svelte";
import VersionedViz from "./lib/VersionedViz.svelte";
import WriteBehindViz from "./lib/WriteBehindViz.svelte";
import WriteThroughViz from "./lib/WriteThroughViz.svelte";

const strategies = [
  { id: "ttl", label: "TTL", color: "#3b82f6" },
  { id: "write-through", label: "Write-Through", color: "#8b5cf6" },
  { id: "write-behind", label: "Write-Behind", color: "#f59e0b" },
  { id: "tagged", label: "Tagged", color: "#10b981" },
  { id: "versioned", label: "Versioned", color: "#ec4899" },
];

let selected = $state("ttl");
let flash = $state(null);
let autoSend = $state(false);
let autoIntervalId = null;
let autoRate = $state(3);
let keyIndex = $state(0);
let writeValue = $state("");
let selectedTag = $state("users");

let ttlCache = createTtlCache(5000, 200);
let writeThroughCache = createWriteThroughCache(300);
let writeBehindCache = createWriteBehindCache(3000, 500);
let taggedCache = createTaggedCache();
let versionedCache = createVersionedCache(1);

let strategy = $derived.by(() => {
  switch (selected) {
    case "ttl":
      return ttlCache;
    case "write-through":
      return writeThroughCache;
    case "write-behind":
      return writeBehindCache;
    case "tagged":
      return taggedCache;
    case "versioned":
      return versionedCache;
    default:
      return ttlCache;
  }
});

let currentKey = $derived(strategy.keys[keyIndex]);

let stats = $derived.by(() => {
  const log = strategy.log;
  const hits = log.filter((e) => e.result === "HIT").length;
  const misses = log.filter((e) => e.result === "MISS" || e.result === "STALE").length;
  const total = hits + misses;
  const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : "0.0";
  const cached = strategy.cache.length;
  return { hits, misses, hitRate, cached };
});

function cycleKey(dir) {
  const keys = strategy.keys;
  keyIndex = (keyIndex + dir + keys.length) % keys.length;
}

async function doRead() {
  await strategy.read(currentKey);
  flash = "hit";
  setTimeout(() => {
    flash = null;
  }, 300);
}

async function doWrite() {
  const val = writeValue || `val_${Date.now().toString(36)}`;
  if (selected === "tagged") {
    strategy.write(currentKey, val);
  } else if (selected === "write-through") {
    await strategy.write(currentKey, val);
  } else {
    strategy.write(currentKey, val);
  }
  writeValue = "";
  flash = "write";
  setTimeout(() => {
    flash = null;
  }, 300);
}

function toggleAutoSend() {
  autoSend = !autoSend;
  if (autoSend) {
    autoIntervalId = setInterval(doRead, 1000 / autoRate);
  } else {
    if (autoIntervalId) clearInterval(autoIntervalId);
    autoIntervalId = null;
  }
}

function updateAutoRate(newRate) {
  autoRate = newRate;
  if (autoSend) {
    if (autoIntervalId) clearInterval(autoIntervalId);
    autoIntervalId = setInterval(doRead, 1000 / autoRate);
  }
}

function resetAll() {
  strategy.reset();
  autoSend = false;
  if (autoIntervalId) clearInterval(autoIntervalId);
  autoIntervalId = null;
  keyIndex = 0;
}

function switchStrategy(id) {
  autoSend = false;
  if (autoIntervalId) clearInterval(autoIntervalId);
  autoIntervalId = null;
  selected = id;
  keyIndex = 0;
}

onDestroy(() => {
  ttlCache.destroy();
  writeThroughCache.destroy();
  writeBehindCache.destroy();
  taggedCache.destroy();
  versionedCache.destroy();
  if (autoIntervalId) clearInterval(autoIntervalId);
});
</script>

<main>
  <AppNav current="cache-invalidation" />

  <header>
    <h1>Cache Invalidation</h1>
    <p class="subtitle">Interactive visualization of cache invalidation strategies</p>
  </header>

  <nav class="tab-bar">
    {#each strategies as strat (strat.id)}
      <button
        class="tab"
        class:active={selected === strat.id}
        style="--tab-color: {strat.color}"
        onclick={() => switchStrategy(strat.id)}
      >
        {strat.label}
      </button>
    {/each}
  </nav>

  <div class="content">
    <div class="viz-panel" class:flash-hit={flash === 'hit'} class:flash-miss={flash === 'miss'} class:flash-write={flash === 'write'}>
      {#if selected === 'ttl'}
        <TtlViz strategy={ttlCache} />
      {:else if selected === 'write-through'}
        <WriteThroughViz strategy={writeThroughCache} />
      {:else if selected === 'write-behind'}
        <WriteBehindViz strategy={writeBehindCache} />
      {:else if selected === 'tagged'}
        <TaggedViz strategy={taggedCache} />
      {:else if selected === 'versioned'}
        <VersionedViz strategy={versionedCache} />
      {/if}
    </div>

    <div class="controls-panel">
      <div class="controls-card">
        <div class="key-cycler">
          <button class="cycle-btn" onclick={() => cycleKey(-1)}>&lt;</button>
          <span class="current-key">{currentKey}</span>
          <button class="cycle-btn" onclick={() => cycleKey(1)}>&gt;</button>
        </div>

        <div class="action-row">
          <button class="read-btn" onclick={doRead}>Read</button>
          <button class="write-btn" onclick={doWrite}>Write</button>
          <button class="reset-btn" onclick={resetAll}>Reset</button>
        </div>

        <div class="write-input">
          <input
            type="text"
            bind:value={writeValue}
            placeholder="Write value (auto if empty)"
          />
        </div>

        <div class="auto-send">
          <button
            class="auto-btn"
            class:active={autoSend}
            onclick={toggleAutoSend}
          >
            {autoSend ? 'Stop' : 'Auto Read'}
          </button>
          <label class="rate-control">
            <span>{autoRate} req/s</span>
            <input
              type="range"
              min="1"
              max="20"
              value={autoRate}
              oninput={(e) => updateAutoRate(Number(e.target.value))}
            />
          </label>
        </div>

        <div class="config-divider"></div>

        {#if selected === 'ttl'}
          <label>
            <span>TTL: {(ttlCache.ttl / 1000).toFixed(1)}s</span>
            <input type="range" min="1000" max="15000" step="500" value={ttlCache.ttl}
              oninput={(e) => ttlCache.setTtl(Number(e.target.value))} />
          </label>
          <label>
            <span>DB Latency: {ttlCache.dbLatency}ms</span>
            <input type="range" min="50" max="2000" step="50" value={ttlCache.dbLatency}
              oninput={(e) => ttlCache.setDbLatency(Number(e.target.value))} />
          </label>
        {:else if selected === 'write-through'}
          <label>
            <span>Write Latency: {writeThroughCache.dbLatency}ms</span>
            <input type="range" min="50" max="2000" step="50" value={writeThroughCache.dbLatency}
              oninput={(e) => writeThroughCache.setLatency(Number(e.target.value))} />
          </label>
        {:else if selected === 'write-behind'}
          <label>
            <span>Flush Interval: {(writeBehindCache.flushInterval / 1000).toFixed(1)}s</span>
            <input type="range" min="1000" max="10000" step="500" value={writeBehindCache.flushInterval}
              oninput={(e) => writeBehindCache.setFlushInterval(Number(e.target.value))} />
          </label>
          <label>
            <span>DB Latency: {writeBehindCache.dbLatency}ms</span>
            <input type="range" min="100" max="3000" step="100" value={writeBehindCache.dbLatency}
              oninput={(e) => writeBehindCache.setDbLatency(Number(e.target.value))} />
          </label>
          <div class="crash-row">
            {#if writeBehindCache.crashed}
              <button class="recover-btn" onclick={() => writeBehindCache.recover()}>Recover</button>
            {:else}
              <button class="crash-btn" onclick={() => writeBehindCache.simulateCrash()}>Simulate Crash</button>
            {/if}
            <button class="flush-btn" onclick={() => writeBehindCache.flush()} disabled={writeBehindCache.crashed}>
              Flush Now
            </button>
          </div>
        {:else if selected === 'tagged'}
          <div class="tag-controls">
            <label>
              <span>Tag to Invalidate</span>
              <select bind:value={selectedTag}>
                {#each taggedCache.allTags as tag}
                  <option value={tag}>{tag}</option>
                {/each}
              </select>
            </label>
            <button class="invalidate-btn" onclick={() => taggedCache.invalidateTag(selectedTag)}>
              Invalidate "{selectedTag}"
            </button>
          </div>
        {:else if selected === 'versioned'}
          <div class="version-controls">
            <span class="version-display">Current Version: v{versionedCache.currentVersion}</span>
            <button class="bump-btn" onclick={() => versionedCache.bumpVersion()}>
              Bump Version
            </button>
          </div>
        {/if}
      </div>

      <div class="stats-row">
        <div class="stat hit-stat">
          <span class="stat-value">{stats.hits}</span>
          <span class="stat-label">Hits</span>
        </div>
        <div class="stat miss-stat">
          <span class="stat-value">{stats.misses}</span>
          <span class="stat-label">Misses</span>
        </div>
        <div class="stat">
          <span class="stat-value">{stats.hitRate}%</span>
          <span class="stat-label">Hit Rate</span>
        </div>
        <div class="stat">
          <span class="stat-value">{stats.cached}</span>
          <span class="stat-label">Cached</span>
        </div>
      </div>

      <RequestLog log={strategy.log} />
    </div>
  </div>

  <footer>
    <div class="how-it-works">
      <h3>How Cache Invalidation Works</h3>
      <p>
        Cache invalidation is the process of removing or updating stale data from a cache.
        When data changes in the source of truth (database), the cache must be updated to prevent
        serving outdated data. Strategies include <code>TTL</code> (time-based expiry),
        <code>Write-Through</code> (synchronous cache+DB updates),
        <code>Write-Behind</code> (async batched DB writes),
        <code>Tag-based</code> (group invalidation), and
        <code>Versioned</code> (generation-based invalidation).
      </p>
    </div>
  </footer>
</main>

<style>
  .viz-panel.flash-hit {
    box-shadow: 0 0 24px rgba(0, 212, 255, 0.4);
  }

  .viz-panel.flash-miss {
    box-shadow: 0 0 24px rgba(245, 158, 11, 0.4);
  }

  .viz-panel.flash-write {
    box-shadow: 0 0 24px rgba(59, 130, 246, 0.4);
  }

  .key-cycler {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
  }

  .cycle-btn {
    width: 24px;
    height: 24px;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 700;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cycle-btn:hover {
    border-color: var(--color-accent-cyan);
    color: var(--color-text);
  }

  .current-key {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-accent-cyan);
    min-width: 100px;
    text-align: center;
  }

  .action-row {
    display: flex;
    gap: 0.4rem;
  }

  .read-btn {
    flex: 1;
    padding: 0.4rem;
    background: linear-gradient(135deg, #0891b2, #00d4ff);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .read-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 16px rgba(0, 212, 255, 0.5);
  }

  .read-btn:active {
    transform: translateY(0);
  }

  .write-btn {
    flex: 1;
    padding: 0.4rem;
    background: linear-gradient(135deg, #1456d0, #1a6dff);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .write-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 16px rgba(26, 109, 255, 0.5);
  }

  .write-btn:active {
    transform: translateY(0);
  }

  .reset-btn {
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    font-size: 0.75rem;
  }

  .write-input input {
    width: 100%;
    padding: 0.35rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    font-size: 0.75rem;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .write-input input:focus {
    border-color: var(--color-accent);
  }

  .write-input input::placeholder {
    color: var(--color-muted);
    font-size: 0.75rem;
  }

  .crash-row {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.15rem;
  }

  .crash-btn {
    flex: 1;
    padding: 0.35rem;
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .crash-btn:hover {
    background: rgba(239, 68, 68, 0.25);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
  }

  .recover-btn {
    flex: 1;
    padding: 0.35rem;
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .recover-btn:hover {
    background: rgba(16, 185, 129, 0.25);
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
  }

  .flush-btn {
    flex: 1;
    padding: 0.35rem;
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .flush-btn:hover {
    background: rgba(139, 92, 246, 0.25);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  }

  .flush-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .tag-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tag-controls select {
    width: 100%;
    padding: 0.35rem 0.6rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    font-size: 0.75rem;
    outline: none;
  }

  .invalidate-btn {
    padding: 0.35rem;
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .invalidate-btn:hover {
    background: rgba(16, 185, 129, 0.25);
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
  }

  .version-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .version-display {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-accent-cyan);
    flex: 1;
  }

  .bump-btn {
    padding: 0.35rem 0.6rem;
    background: rgba(236, 72, 153, 0.15);
    color: #ec4899;
    border: 1px solid rgba(236, 72, 153, 0.3);
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .bump-btn:hover {
    background: rgba(236, 72, 153, 0.25);
    box-shadow: 0 0 12px rgba(236, 72, 153, 0.3);
  }

  .stat.hit-stat .stat-value { color: var(--color-success); }
  .stat.miss-stat .stat-value { color: #f59e0b; }
</style>
