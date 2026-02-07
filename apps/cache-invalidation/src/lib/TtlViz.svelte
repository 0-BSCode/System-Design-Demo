<script>
import { onDestroy, onMount } from "svelte";

let { strategy } = $props();
let now = $state(Date.now());
let rafId;

function tick() {
  now = Date.now();
  rafId = requestAnimationFrame(tick);
}

onMount(() => {
  rafId = requestAnimationFrame(tick);
});

onDestroy(() => {
  if (rafId) cancelAnimationFrame(rafId);
});

function ttlRemaining(entry) {
  const elapsed = now - entry.createdAt;
  const remaining = Math.max(0, entry.ttlMs - elapsed);
  return remaining / entry.ttlMs;
}

function ttlColor(ratio) {
  if (ratio > 0.5) return "#00d4ff";
  if (ratio > 0.2) return "#f59e0b";
  return "#ef4444";
}

function isExpired(entry) {
  return now - entry.createdAt > entry.ttlMs;
}
</script>

<div class="viz ttl-viz">
  <h3>TTL (Time-To-Live)</h3>
  <p class="description">
    Each cache entry has a TTL countdown. When the timer expires, the entry becomes stale
    and the next read triggers a cache miss, fetching fresh data from the database.
  </p>

  <div class="entries-grid">
    {#each strategy.cache as entry (entry.key)}
      {@const ratio = ttlRemaining(entry)}
      {@const expired = isExpired(entry)}
      <div class="entry-card" class:expired>
        <div class="entry-key">{entry.key}</div>
        <div class="entry-value">{entry.value}</div>
        <div class="ttl-bar-track">
          <div
            class="ttl-bar-fill"
            style="width: {ratio * 100}%; background: {ttlColor(ratio)}"
          ></div>
        </div>
        <div class="ttl-label" style="color: {ttlColor(ratio)}">
          {expired ? "EXPIRED" : `${((entry.ttlMs - (now - entry.createdAt)) / 1000).toFixed(1)}s`}
        </div>
      </div>
    {/each}
    {#if strategy.cache.length === 0}
      <div class="empty-state">Cache is empty. Read a key to populate.</div>
    {/if}
  </div>

  <div class="db-section">
    <div class="db-label">Database ({strategy.db.length} entries)</div>
    <div class="db-entries">
      {#each strategy.db as entry (entry.key)}
        <span class="db-chip">{entry.key}: {entry.value}</span>
      {/each}
    </div>
  </div>
</div>

<style>
  .ttl-viz {
    min-height: 200px;
  }

  .entries-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .entry-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 0.75rem;
    transition: all 0.3s ease;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .entry-card.expired {
    opacity: 0.4;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .entry-key {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.75rem;
    color: var(--color-accent-cyan);
    font-weight: 600;
    margin-bottom: 4px;
  }

  .entry-value {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--color-text);
  }

  .ttl-bar-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .ttl-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: background 0.3s ease;
  }

  .ttl-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-align: right;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  .db-section {
    border-top: 1px solid var(--color-border);
    padding-top: 0.75rem;
    margin-top: 0.5rem;
  }

  .db-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .db-entries {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .db-chip {
    font-size: 0.7rem;
    padding: 3px 8px;
    background: rgba(26, 109, 255, 0.08);
    border: 1px solid rgba(26, 109, 255, 0.15);
    border-radius: 4px;
    color: var(--color-muted);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
</style>
