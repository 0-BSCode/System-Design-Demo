<script>
let { cacheStrategy } = $props();

function strategyLabel(s) {
  switch (s) {
    case "cache-first":
      return "Cache-First";
    case "network-first":
      return "Network-First";
    case "swr":
      return "Stale-While-Revalidate";
    default:
      return s;
  }
}

function stepLabel(step) {
  switch (step) {
    case "check-cache":
      return "Checking cache...";
    case "cache-hit":
      return "Cache HIT";
    case "cache-stale":
      return "Cache HIT (stale)";
    case "network-fetch":
      return "Fetching network...";
    case "network-success":
      return "Network OK";
    case "network-fail":
      return "Network FAILED";
    case "background-revalidate":
      return "Revalidating...";
    default:
      return step;
  }
}

function stepColor(step) {
  switch (step) {
    case "cache-hit":
      return "#22c55e";
    case "cache-stale":
      return "#f59e0b";
    case "network-success":
      return "#22c55e";
    case "network-fail":
      return "#ef4444";
    case "background-revalidate":
      return "#00d4ff";
    default:
      return "#6b7a94";
  }
}

function formatTTL(ms) {
  if (ms <= 0) return "expired";
  return `${(ms / 1000).toFixed(0)}s`;
}
</script>

<div class="viz cache-viz">
  <h3>Cache Strategies</h3>
  <p class="description">
    Simulates a service worker intercepting requests with configurable caching strategies.
  </p>

  <!-- Resource buttons -->
  <div class="resource-row">
    {#each cacheStrategy.resources as res (res.url)}
      <button
        class="resource-btn"
        style="--res-color: {res.color}"
        onclick={() => cacheStrategy.fetchResource(res.url)}
        disabled={cacheStrategy.animating !== null}
      >
        <span class="res-label">{res.label}</span>
        <span class="res-url">{res.url}</span>
      </button>
    {/each}
  </div>

  <!-- Flow diagram -->
  <div class="flow-diagram">
    <div class="flow-node client-node" class:active={cacheStrategy.animating !== null}>
      <span class="node-icon">{"\u{1F4F1}"}</span>
      <span class="node-label">Client</span>
    </div>

    <div class="flow-arrow" class:active={cacheStrategy.animating !== null}>{"\u2192"}</div>

    <div class="flow-node sw-node" class:active={cacheStrategy.animating !== null}>
      <span class="node-icon">{"\u2699"}</span>
      <span class="node-label">Service Worker</span>
      {#if cacheStrategy.animating}
        <span class="sw-strategy">{strategyLabel(cacheStrategy.animating.strategy)}</span>
      {/if}
    </div>

    <div class="flow-branches">
      <div class="branch cache-branch"
        class:active={cacheStrategy.animating && (
          cacheStrategy.animating.step === "check-cache" ||
          cacheStrategy.animating.step === "cache-hit" ||
          cacheStrategy.animating.step === "cache-stale"
        )}
      >
        <span class="branch-arrow">{"\u2191"}</span>
        <div class="branch-node">
          <span class="node-icon">{"\u{1F4BE}"}</span>
          <span class="node-label">Cache</span>
        </div>
      </div>

      <div class="branch network-branch"
        class:active={cacheStrategy.animating && (
          cacheStrategy.animating.step === "network-fetch" ||
          cacheStrategy.animating.step === "network-success" ||
          cacheStrategy.animating.step === "network-fail" ||
          cacheStrategy.animating.step === "background-revalidate"
        )}
      >
        <span class="branch-arrow">{"\u2193"}</span>
        <div class="branch-node">
          <span class="node-icon">{"\u{1F310}"}</span>
          <span class="node-label">Network</span>
        </div>
      </div>
    </div>
  </div>

  {#if cacheStrategy.animating}
    <div class="anim-status" style="color: {stepColor(cacheStrategy.animating.step)}">
      {stepLabel(cacheStrategy.animating.step)}
      <span class="anim-url">{cacheStrategy.animating.url}</span>
    </div>
  {/if}

  <!-- Cache entries -->
  <div class="cache-table">
    <div class="cache-header">
      <span>URL</span>
      <span>Data</span>
      <span>TTL</span>
    </div>
    {#each Object.entries(cacheStrategy.cache) as [url, entry] (url)}
      {@const stale = entry.remaining <= 0}
      <div class="cache-row" class:stale>
        <span class="cache-url">{url}</span>
        <span class="cache-data">{entry.data}</span>
        <span class="cache-ttl" class:stale>{formatTTL(entry.remaining)}</span>
      </div>
    {/each}
    {#if Object.keys(cacheStrategy.cache).length === 0}
      <div class="cache-empty">Cache is empty</div>
    {/if}
  </div>
</div>

<style>
  .cache-viz {
    text-align: left;
  }

  .resource-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .resource-btn {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0.5rem 0.6rem;
    background: color-mix(in srgb, var(--res-color) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--res-color) 30%, transparent);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .resource-btn:hover:not(:disabled) {
    border-color: var(--res-color);
    box-shadow: 0 0 12px color-mix(in srgb, var(--res-color) 30%, transparent);
  }

  .resource-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .res-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .res-url {
    font-size: 0.65rem;
    color: var(--color-muted);
    font-family: monospace;
  }

  /* Flow diagram */

  .flow-diagram {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .flow-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    transition: all 0.3s ease;
  }

  .flow-node.active {
    border-color: rgba(0, 212, 255, 0.4);
    box-shadow: 0 0 12px rgba(0, 212, 255, 0.2);
  }

  .node-icon {
    font-size: 1.2rem;
  }

  .node-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--color-muted);
  }

  .sw-strategy {
    font-size: 0.6rem;
    color: #00d4ff;
    font-weight: 600;
  }

  .flow-arrow {
    font-size: 1.2rem;
    color: var(--color-border);
    transition: color 0.3s ease;
  }

  .flow-arrow.active {
    color: #00d4ff;
  }

  .flow-branches {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-left: 0.25rem;
  }

  .branch {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    opacity: 0.4;
    transition: all 0.3s ease;
  }

  .branch.active {
    opacity: 1;
  }

  .branch-arrow {
    font-size: 1rem;
    color: var(--color-border);
  }

  .branch.active .branch-arrow {
    color: #00d4ff;
  }

  .branch-node {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    transition: all 0.3s ease;
  }

  .branch.active .branch-node {
    border-color: rgba(0, 212, 255, 0.3);
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.15);
  }

  .branch-node .node-icon {
    font-size: 0.85rem;
  }

  .branch-node .node-label {
    font-size: 0.65rem;
  }

  .anim-status {
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.4rem;
    margin-bottom: 0.75rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .anim-url {
    font-size: 0.7rem;
    color: var(--color-muted);
    margin-left: 0.5rem;
    font-family: monospace;
  }

  /* Cache table */

  .cache-table {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .cache-header {
    display: grid;
    grid-template-columns: 1fr 1.5fr 0.5fr;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    background: rgba(0, 212, 255, 0.06);
    border-bottom: 1px solid var(--color-border);
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }

  .cache-row {
    display: grid;
    grid-template-columns: 1fr 1.5fr 0.5fr;
    gap: 0.5rem;
    padding: 0.35rem 0.6rem;
    font-size: 0.72rem;
    border-bottom: 1px solid rgba(13, 27, 51, 0.5);
    animation: slideIn 0.2s ease;
    transition: background 0.3s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .cache-row:last-child {
    border-bottom: none;
  }

  .cache-row.stale {
    background: rgba(245, 158, 11, 0.06);
  }

  .cache-url {
    font-family: monospace;
    color: var(--color-accent-cyan);
    font-size: 0.68rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cache-data {
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cache-ttl {
    text-align: right;
    color: #22c55e;
    font-weight: 600;
  }

  .cache-ttl.stale {
    color: #f59e0b;
  }

  .cache-empty {
    padding: 1rem;
    text-align: center;
    color: var(--color-muted);
    font-size: 0.78rem;
  }
</style>
