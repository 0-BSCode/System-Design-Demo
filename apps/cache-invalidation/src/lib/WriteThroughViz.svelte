<script>
let { strategy } = $props();

function isPending(key) {
  return strategy.pendingOps.some((op) => op.key === key);
}

function inSync(key) {
  const cached = strategy.cache.find((e) => e.key === key);
  const dbEntry = strategy.db.find((e) => e.key === key);
  if (!cached || !dbEntry) return true;
  return cached.value === dbEntry.value;
}

function allInSync() {
  return strategy.cache.every((e) => {
    const dbEntry = strategy.db.find((d) => d.key === e.key);
    return dbEntry && dbEntry.value === e.value;
  });
}
</script>

<div class="viz wt-viz">
  <h3>Write-Through</h3>
  <p class="description">
    Writes update both cache and database synchronously. Data is always consistent,
    but writes are slower due to DB latency. Reads from cache are fast.
  </p>

  <div class="columns">
    <div class="column cache-col">
      <div class="col-header">Cache</div>
      {#each strategy.cache as entry (entry.key)}
        <div class="entry" class:pending={isPending(entry.key)} class:synced={!isPending(entry.key)}>
          <span class="entry-key">{entry.key}</span>
          <span class="entry-val">{entry.value}</span>
          {#if isPending(entry.key)}
            <span class="sync-badge pending-badge">SYNCING</span>
          {/if}
        </div>
      {/each}
      {#if strategy.cache.length === 0}
        <div class="col-empty">Empty</div>
      {/if}
    </div>

    <div class="arrow-col">
      <div class="arrow-container">
        {#if strategy.pendingOps.length > 0}
          <div class="arrow-pulse"></div>
        {/if}
        <div class="arrow-line"></div>
        <div class="arrow-head"></div>
      </div>
      {#if allInSync() && strategy.cache.length > 0}
        <div class="sync-label">IN SYNC</div>
      {/if}
    </div>

    <div class="column db-col">
      <div class="col-header">Database</div>
      {#each strategy.db as entry (entry.key)}
        <div class="entry">
          <span class="entry-key">{entry.key}</span>
          <span class="entry-val">{entry.value}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .wt-viz {
    min-height: 200px;
  }

  .columns {
    display: flex;
    gap: 0.75rem;
    margin: 1rem 0;
    align-items: flex-start;
  }

  .column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .col-header {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0.25rem;
  }

  .cache-col .col-header {
    color: #00d4ff;
  }

  .db-col .col-header {
    color: #8b5cf6;
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.75rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-4px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .entry.pending {
    border-color: rgba(245, 158, 11, 0.4);
    animation: pulse 1s ease infinite;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: none; }
    50% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.3); }
  }

  .entry.synced {
    border-color: rgba(0, 212, 255, 0.2);
  }

  .entry-key {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.7rem;
    color: var(--color-accent-cyan);
    font-weight: 600;
  }

  .entry-val {
    flex: 1;
    color: var(--color-text);
    font-weight: 500;
  }

  .sync-badge {
    font-size: 0.55rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    text-transform: uppercase;
  }

  .pending-badge {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }

  .arrow-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 2rem;
    min-width: 50px;
    gap: 0.5rem;
  }

  .arrow-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .arrow-line {
    width: 2px;
    height: 40px;
    background: var(--color-border);
  }

  .arrow-head {
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid var(--color-border);
  }

  .arrow-pulse {
    position: absolute;
    top: 0;
    width: 8px;
    height: 8px;
    background: #f59e0b;
    border-radius: 50%;
    animation: travelDown 0.8s ease infinite;
  }

  @keyframes travelDown {
    0% { top: 0; opacity: 1; }
    100% { top: 40px; opacity: 0; }
  }

  .sync-label {
    font-size: 0.6rem;
    font-weight: 700;
    color: #10b981;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 6px;
    background: rgba(16, 185, 129, 0.1);
    border-radius: 4px;
  }

  .col-empty {
    text-align: center;
    padding: 1rem;
    color: var(--color-muted);
    font-size: 0.8rem;
  }
</style>
