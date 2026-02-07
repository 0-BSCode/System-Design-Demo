<script>
let { strategy } = $props();

let groupedByVersion = $derived.by(() => {
  const groups = {};
  for (const entry of strategy.cache) {
    const v = entry.version;
    if (!groups[v]) groups[v] = [];
    groups[v].push(entry);
  }
  // Sort versions descending (newest first)
  return Object.entries(groups)
    .map(([version, entries]) => ({ version: Number(version), entries }))
    .sort((a, b) => b.version - a.version);
});
</script>

<div class="viz versioned-viz">
  <h3>Versioned Invalidation</h3>
  <p class="description">
    Cache entries are stamped with a version number. When the version is bumped,
    all existing entries become orphaned (stale). Only entries matching the current version are valid.
  </p>

  <div class="version-indicator">
    <span class="version-label">Current Version</span>
    <span class="version-number">v{strategy.currentVersion}</span>
  </div>

  <div class="version-groups">
    {#each groupedByVersion as group (group.version)}
      {@const isCurrent = group.version === strategy.currentVersion}
      <div class="version-group" class:current={isCurrent} class:orphaned={!isCurrent}>
        <div class="group-header">
          <span class="group-version">v{group.version}</span>
          {#if isCurrent}
            <span class="current-badge">CURRENT</span>
          {:else}
            <span class="orphaned-badge">ORPHANED</span>
          {/if}
          <span class="group-count">{group.entries.length} entries</span>
        </div>
        <div class="group-entries">
          {#each group.entries as entry (entry.key)}
            <div class="entry" class:current-entry={isCurrent}>
              <span class="entry-key">{entry.key}</span>
              <span class="entry-val">{entry.value}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
    {#if strategy.cache.length === 0}
      <div class="empty-state">Cache is empty. Read keys to populate.</div>
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
  .versioned-viz {
    min-height: 200px;
  }

  .version-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.75rem 0;
    padding: 0.5rem 0.75rem;
    background: rgba(0, 212, 255, 0.06);
    border: 1px solid rgba(0, 212, 255, 0.15);
    border-radius: 8px;
  }

  .version-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .version-number {
    font-size: 1.2rem;
    font-weight: 800;
    color: #00d4ff;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }

  .version-groups {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0.75rem 0;
  }

  .version-group {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    transition: all 0.3s ease;
  }

  .version-group.current {
    border-color: rgba(0, 212, 255, 0.3);
    background: rgba(0, 212, 255, 0.03);
  }

  .version-group.orphaned {
    opacity: 0.45;
    border-color: rgba(107, 122, 148, 0.2);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .group-version {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .current-badge {
    font-size: 0.55rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(0, 212, 255, 0.2);
    color: #00d4ff;
    text-transform: uppercase;
  }

  .orphaned-badge {
    font-size: 0.55rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(107, 122, 148, 0.15);
    color: var(--color-muted);
    text-transform: uppercase;
  }

  .group-count {
    font-size: 0.65rem;
    color: var(--color-muted);
    margin-left: auto;
  }

  .group-entries {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    background: var(--color-bg);
    border: 1px solid rgba(107, 122, 148, 0.15);
    border-radius: 5px;
    font-size: 0.72rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .entry.current-entry {
    border-color: rgba(0, 212, 255, 0.2);
  }

  .entry-key {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.68rem;
    color: var(--color-accent-cyan);
    font-weight: 600;
  }

  .entry-val {
    color: var(--color-text);
    font-weight: 500;
  }

  .empty-state {
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
