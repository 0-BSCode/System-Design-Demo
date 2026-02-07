<script>
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
  <header>
    <h1>Cache Invalidation</h1>
    <p class="subtitle">Interactive visualization of cache invalidation strategies</p>
  </header>

  <nav class="strategy-tabs">
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
  :global(:root) {
    --color-bg: #000000;
    --color-surface: #030712;
    --color-border: #0d1b33;
    --color-text: #ffffff;
    --color-muted: #6b7a94;
    --color-accent: #1a6dff;
    --color-accent-rgb: 26, 109, 255;
    --color-accent-cyan: #00d4ff;
    --color-success: #00d4ff;
    --color-danger: #ef4444;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    min-height: 100vh;
  }

  :global(body::before) {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% 100%, rgba(26, 109, 255, 0.28) 0%, rgba(0, 212, 255, 0.10) 40%, transparent 70%),
      radial-gradient(ellipse 40% 30% at 80% 90%, rgba(0, 212, 255, 0.08) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }

  :global(#app) {
    position: relative;
    z-index: 1;
  }

  :global(*) {
    box-sizing: border-box;
  }

  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    margin: 0 0 0.25rem 0;
    background: linear-gradient(135deg, #00d4ff, #1a6dff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: var(--color-muted);
    margin: 0;
    font-size: 0.95rem;
  }

  .strategy-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .tab {
    flex: 1;
    min-width: 100px;
    padding: 0.65rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-muted);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .tab:hover {
    border-color: var(--tab-color);
    color: var(--color-text);
  }

  .tab.active {
    background: color-mix(in srgb, var(--tab-color) 15%, transparent);
    border-color: var(--tab-color);
    color: var(--tab-color);
    box-shadow: 0 0 16px color-mix(in srgb, var(--tab-color) 25%, transparent),
                inset 0 -2px 16px rgba(0, 212, 255, 0.10);
  }

  .content {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 720px) {
    .content {
      grid-template-columns: 1fr;
    }
  }

  .viz-panel {
    background: var(--color-surface);
    background-image: linear-gradient(180deg, transparent 40%, rgba(26, 109, 255, 0.08) 100%);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    transition: box-shadow 0.3s ease;
    box-shadow: 0 0 50px rgba(26, 109, 255, 0.06);
  }

  .viz-panel:hover {
    box-shadow: 0 0 50px rgba(26, 109, 255, 0.06), 0 0 20px rgba(0, 212, 255, 0.10);
  }

  .viz-panel.flash-hit {
    box-shadow: 0 0 24px rgba(0, 212, 255, 0.4);
  }

  .viz-panel.flash-miss {
    box-shadow: 0 0 24px rgba(245, 158, 11, 0.4);
  }

  .viz-panel.flash-write {
    box-shadow: 0 0 24px rgba(59, 130, 246, 0.4);
  }

  :global(.viz h3) {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
  }

  :global(.viz .description) {
    color: var(--color-muted);
    font-size: 0.8rem;
    margin: 0 0 0.5rem 0;
    line-height: 1.5;
  }

  .controls-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .controls-card {
    background: var(--color-surface);
    background-image: linear-gradient(180deg, transparent 40%, rgba(26, 109, 255, 0.08) 100%);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    box-shadow: 0 0 50px rgba(26, 109, 255, 0.06);
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
    background: transparent;
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    color: var(--color-text);
    border-color: var(--color-text);
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

  .auto-send {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .auto-btn {
    padding: 0.3rem 0.55rem;
    background: var(--color-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .auto-btn.active {
    background: rgba(239, 68, 68, 0.15);
    border-color: #ef4444;
    color: #ef4444;
  }

  .rate-control {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .rate-control span {
    font-size: 0.72rem;
    color: var(--color-muted);
  }

  .rate-control input[type="range"] {
    width: 100%;
  }

  .config-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.5rem 0;
  }

  .controls-card label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 0.25rem;
  }

  .controls-card label:last-child {
    margin-bottom: 0;
  }

  .controls-card label span {
    font-size: 0.78rem;
    color: var(--color-text);
    font-weight: 500;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: var(--color-border);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  input[type="range"]:hover {
    background: color-mix(in srgb, var(--color-border) 80%, var(--color-accent));
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--color-accent);
    border: 2px solid color-mix(in srgb, var(--color-accent) 60%, white);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(26, 109, 255, 0.4);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 14px rgba(26, 109, 255, 0.6);
  }

  input[type="range"]::-webkit-slider-thumb:active {
    transform: scale(1.05);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--color-accent);
    border: 2px solid color-mix(in srgb, var(--color-accent) 60%, white);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(26, 109, 255, 0.4);
  }

  input[type="range"]::-moz-range-track {
    height: 6px;
    background: var(--color-border);
    border-radius: 3px;
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

  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
  }

  .stat {
    background: var(--color-surface);
    background-image: linear-gradient(180deg, transparent 40%, rgba(26, 109, 255, 0.06) 100%);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.35rem 0.25rem;
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1rem;
    font-weight: 700;
  }

  .stat-label {
    font-size: 0.6rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat.hit-stat .stat-value { color: var(--color-success); }
  .stat.miss-stat .stat-value { color: #f59e0b; }

  footer {
    margin-top: 2rem;
  }

  .how-it-works {
    background: var(--color-surface);
    background-image: linear-gradient(180deg, transparent 40%, rgba(26, 109, 255, 0.08) 100%);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 0 50px rgba(26, 109, 255, 0.06);
  }

  .how-it-works h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.95rem;
  }

  .how-it-works p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-muted);
    line-height: 1.6;
  }

  .how-it-works code {
    background: var(--color-bg);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
    color: var(--color-accent-cyan);
  }
</style>
