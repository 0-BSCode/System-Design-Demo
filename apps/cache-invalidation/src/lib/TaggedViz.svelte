<script>
let { strategy } = $props();

const TAG_COLORS = {
  users: "#3b82f6",
  profiles: "#6366f1",
  products: "#f59e0b",
  catalog: "#f97316",
  config: "#10b981",
  ui: "#14b8a6",
  i18n: "#06b6d4",
};

function tagColor(tag) {
  return TAG_COLORS[tag] || "#6b7a94";
}
</script>

<div class="viz tagged-viz">
  <h3>Tag-Based Invalidation</h3>
  <p class="description">
    Cache entries are associated with tags. Invalidating a tag removes all entries
    with that tag at once — useful for group invalidation (e.g., all user data).
  </p>

  <div class="tag-legend">
    {#each strategy.allTags as tag}
      <span class="legend-pill" style="--tag-color: {tagColor(tag)}">{tag}</span>
    {/each}
  </div>

  <div class="entries-list">
    {#each strategy.cache as entry (entry.key)}
      <div class="entry-row" style="--border-color: {tagColor(entry.tags[0])}">
        <div class="entry-info">
          <span class="entry-key">{entry.key}</span>
          <span class="entry-val">{entry.value}</span>
        </div>
        <div class="entry-tags">
          {#each entry.tags as tag}
            <span class="tag-pill" style="--tag-color: {tagColor(tag)}">{tag}</span>
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
  .tagged-viz {
    min-height: 200px;
  }

  .tag-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.75rem 0;
  }

  .legend-pill {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--tag-color) 15%, transparent);
    color: var(--tag-color);
    border: 1px solid color-mix(in srgb, var(--tag-color) 30%, transparent);
  }

  .entries-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0.75rem 0;
  }

  .entry-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--border-color);
    border-radius: 8px;
    animation: slideIn 0.25s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .entry-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .entry-key {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.75rem;
    color: var(--color-accent-cyan);
    font-weight: 600;
  }

  .entry-val {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .entry-tags {
    display: flex;
    gap: 4px;
  }

  .tag-pill {
    font-size: 0.6rem;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--tag-color) 15%, transparent);
    color: var(--tag-color);
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
