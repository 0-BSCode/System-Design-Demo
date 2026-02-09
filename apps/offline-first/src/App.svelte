<script>
import { AppNav } from "@rate-limiter/ui";
import { onDestroy } from "svelte";
import CacheStrategyViz from "./lib/CacheStrategyViz.svelte";
import ConflictViz from "./lib/ConflictViz.svelte";
import EventLog from "./lib/EventLog.svelte";
import {
  createCacheStrategy,
  createConflictResolver,
  createSyncQueue,
} from "./lib/offlineFirst.svelte.js";
import SyncQueueViz from "./lib/SyncQueueViz.svelte";

const tabs = [
  { id: "sync-queue", label: "Sync Queue", color: "#3b82f6" },
  { id: "conflict-resolution", label: "Conflict Resolution", color: "#8b5cf6" },
  { id: "cache-strategies", label: "Cache Strategies", color: "#f59e0b" },
];

let selected = $state("sync-queue");

let syncQueue = createSyncQueue();
let conflictResolver = createConflictResolver();
let cacheStrategy = createCacheStrategy();

let currentLog = $derived.by(() => {
  switch (selected) {
    case "sync-queue":
      return syncQueue.log;
    case "conflict-resolution":
      return conflictResolver.log;
    case "cache-strategies":
      return cacheStrategy.log;
    default:
      return [];
  }
});

let stats = $derived.by(() => {
  switch (selected) {
    case "sync-queue":
      return {
        items: [
          { label: "Local", value: syncQueue.localItems.length, color: null },
          { label: "Pending", value: syncQueue.mutationQueue.length, color: "#f59e0b" },
          { label: "Synced", value: syncQueue.syncedCount, color: "#22c55e" },
          { label: "Failed", value: syncQueue.failedCount, color: "#ef4444" },
        ],
      };
    case "conflict-resolution":
      return {
        items: [
          {
            label: "A Pending",
            value: conflictResolver.clientA.pendingEdits.length,
            color: "#3b82f6",
          },
          {
            label: "B Pending",
            value: conflictResolver.clientB.pendingEdits.length,
            color: "#8b5cf6",
          },
          { label: "Conflicts", value: conflictResolver.conflicts.length, color: "#ef4444" },
          { label: "Resolved", value: conflictResolver.resolvedCount, color: "#22c55e" },
        ],
      };
    case "cache-strategies":
      return {
        items: [
          { label: "Cache Hits", value: cacheStrategy.cacheHits, color: "#22c55e" },
          { label: "Network", value: cacheStrategy.networkHits, color: "#3b82f6" },
          { label: "Avg ms", value: cacheStrategy.avgLatency, color: "#00d4ff" },
          { label: "Stale", value: cacheStrategy.staleServes, color: "#f59e0b" },
        ],
      };
    default:
      return { items: [] };
  }
});

function resetCurrent() {
  switch (selected) {
    case "sync-queue":
      syncQueue.reset();
      break;
    case "conflict-resolution":
      conflictResolver.reset();
      break;
    case "cache-strategies":
      cacheStrategy.reset();
      break;
  }
}

function switchTab(id) {
  selected = id;
}

onDestroy(() => {
  syncQueue.destroy();
  conflictResolver.destroy();
  cacheStrategy.destroy();
});
</script>

<main>
  <AppNav current="offline-first" />

  <header>
    <h1>Offline-First Patterns</h1>
    <p class="subtitle">Interactive visualization of offline-first application approaches</p>
  </header>

  <nav class="tab-bar">
    {#each tabs as tab (tab.id)}
      <button
        class="tab"
        class:active={selected === tab.id}
        style="--tab-color: {tab.color}"
        onclick={() => switchTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </nav>

  <div class="content">
    <div class="viz-panel">
      {#if selected === 'sync-queue'}
        <SyncQueueViz queue={syncQueue} />
      {:else if selected === 'conflict-resolution'}
        <ConflictViz resolver={conflictResolver} />
      {:else if selected === 'cache-strategies'}
        <CacheStrategyViz {cacheStrategy} />
      {/if}
    </div>

    <div class="controls-panel">
      <div class="controls-card">
        {#if selected === 'sync-queue'}
          <div class="send-row">
            <button
              class="send-btn"
              class:offline={!syncQueue.isOnline}
              onclick={() => syncQueue.toggleOnline()}
            >
              {syncQueue.isOnline ? "\u{1F7E2} Online" : "\u{1F534} Offline"}
            </button>
            <button class="reset-btn" onclick={resetCurrent}>Reset</button>
          </div>
          <div class="online-hint">
            {#if syncQueue.isOnline}
              Mutations sync automatically to server
            {:else}
              Mutations will queue until back online
            {/if}
          </div>
        {:else if selected === 'conflict-resolution'}
          <div class="send-row">
            <button class="reset-btn" onclick={resetCurrent}>Reset</button>
          </div>
          <div class="config-divider"></div>
          <label>
            <span>Strategy</span>
            <select
              value={conflictResolver.strategy}
              onchange={(e) => conflictResolver.setStrategy(e.target.value)}
            >
              <option value="lww">Last-Write-Wins</option>
              <option value="crdt">CRDT (LWW-Register)</option>
            </select>
          </label>
        {:else if selected === 'cache-strategies'}
          <div class="send-row">
            <button
              class="send-btn"
              class:offline={!cacheStrategy.isOnline}
              onclick={() => cacheStrategy.toggleOnline()}
            >
              {cacheStrategy.isOnline ? "\u{1F7E2} Online" : "\u{1F534} Offline"}
            </button>
            <button class="reset-btn" onclick={() => cacheStrategy.clearCache()}>Clear Cache</button>
            <button class="reset-btn" onclick={resetCurrent}>Reset</button>
          </div>
          <div class="config-divider"></div>
          <label>
            <span>Strategy</span>
            <select
              value={cacheStrategy.strategy}
              onchange={(e) => cacheStrategy.setStrategy(e.target.value)}
            >
              <option value="cache-first">Cache-First</option>
              <option value="network-first">Network-First</option>
              <option value="swr">Stale-While-Revalidate</option>
            </select>
          </label>
          <label>
            <span>Network Latency: {cacheStrategy.latency}ms</span>
            <input
              type="range"
              min="50"
              max="3000"
              step="50"
              value={cacheStrategy.latency}
              oninput={(e) => cacheStrategy.setLatency(Number(e.target.value))}
            />
          </label>
        {/if}
      </div>

      <div class="stats-row">
        {#each stats.items as stat}
          <div class="stat">
            <span class="stat-value" style={stat.color ? `color: ${stat.color}` : ''}>{stat.value}</span>
            <span class="stat-label">{stat.label}</span>
          </div>
        {/each}
      </div>

      <EventLog log={currentLog} />
    </div>
  </div>

  <footer>
    <div class="how-it-works">
      {#if selected === 'sync-queue'}
        <h3>How Sync Queues Work</h3>
        <p>
          A <strong>sync queue</strong> enables <strong>local-first</strong> applications where all
          writes happen instantly against a local store. Mutations are enqueued and
          <strong>drained to the server</strong> when the device is online. This gives users
          <strong>instant feedback</strong> regardless of network state. When connectivity returns,
          the queue drains automatically, applying changes in order. Failed mutations can be
          retried. This pattern powers apps like <code>Notion</code>, <code>Linear</code>, and
          <code>Figma</code>.
        </p>
      {:else if selected === 'conflict-resolution'}
        <h3>How Conflict Resolution Works</h3>
        <p>
          When multiple clients edit the same data offline, <strong>conflicts</strong> arise at sync time.
          <strong>Last-Write-Wins (LWW)</strong> resolves conflicts by timestamp — the latest edit wins.
          <strong>CRDTs</strong> (Conflict-free Replicated Data Types) use <strong>vector clocks</strong>
          to detect concurrent edits and resolve them deterministically. LWW-Registers compare version
          vectors; when edits are truly concurrent, a <strong>replica ID tiebreak</strong> ensures
          consistency. CRDTs power systems like <code>Riak</code>, <code>Automerge</code>, and
          <code>Yjs</code>.
        </p>
      {:else if selected === 'cache-strategies'}
        <h3>How Cache Strategies Work</h3>
        <p>
          <strong>Service workers</strong> intercept network requests and apply caching strategies.
          <strong>Cache-First</strong> checks the cache before the network — fast but may serve stale data.
          <strong>Network-First</strong> tries the network first, falling back to cache if offline — always
          fresh when online. <strong>Stale-While-Revalidate</strong> returns cached data immediately (even if stale)
          while <strong>refreshing in the background</strong> — the best of both worlds. Each strategy has
          tradeoffs between <strong>freshness</strong>, <strong>performance</strong>, and
          <strong>offline availability</strong>.
        </p>
      {/if}
    </div>
  </footer>
</main>

<style>
  .send-btn.offline {
    background: linear-gradient(135deg, #b45309, #f59e0b);
  }

  .online-hint {
    font-size: 0.72rem;
    color: var(--color-muted);
    text-align: center;
    padding: 0.2rem 0;
  }

  select {
    width: 100%;
    padding: 0.45rem 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    font-size: 0.8rem;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  select:focus {
    border-color: var(--color-accent);
  }

  option {
    background: var(--color-bg);
    color: var(--color-text);
  }
</style>
