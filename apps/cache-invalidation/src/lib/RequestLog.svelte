<script>
let { log = [] } = $props();

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 1000) return "just now";
  return `${(diff / 1000).toFixed(1)}s ago`;
}

function entryClass(entry) {
  const combo = `${entry.type}/${entry.result}`;
  switch (combo) {
    case "READ/HIT":
      return "hit";
    case "READ/MISS":
      return "miss";
    case "READ/STALE":
      return "miss";
    case "WRITE/OK":
      return "write";
    case "FLUSH/OK":
      return "flush";
    case "INVALIDATE/OK":
      return "invalidate";
    case "CRASH/LOST":
      return "crash";
    case "BUMP/OK":
      return "bump";
    default:
      return "write";
  }
}

function entryLabel(entry) {
  const combo = `${entry.type}/${entry.result}`;
  switch (combo) {
    case "READ/HIT":
      return "HIT";
    case "READ/MISS":
      return "MISS";
    case "READ/STALE":
      return "STALE";
    case "WRITE/OK":
      return "WRITE";
    case "FLUSH/OK":
      return "FLUSH";
    case "INVALIDATE/OK":
      return "INVALIDATE";
    case "CRASH/LOST":
      return "CRASH";
    case "BUMP/OK":
      return "BUMP";
    default:
      return entry.type;
  }
}
</script>

<div class="log-panel">
  <h4>Operation Log</h4>
  <div class="log-entries">
    {#each log as entry (entry.id)}
      <div class="log-entry {entryClass(entry)}">
        <span class="badge">{entryLabel(entry)}</span>
        <span class="key">{entry.key}</span>
        <span class="time">{timeAgo(entry.time)}</span>
      </div>
    {/each}
    {#if log.length === 0}
      <div class="empty">No operations yet. Click "Read" or "Write" to start!</div>
    {/if}
  </div>
</div>

<style>
  .log-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.75rem;
  }

  h4 {
    margin: 0 0 0.4rem 0;
    font-size: 0.8rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .log-entries {
    max-height: 160px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 4px;
  }

  .log-entry {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .log-entry.hit {
    background: rgba(0, 212, 255, 0.1);
    border: 1px solid rgba(0, 212, 255, 0.2);
  }
  .log-entry.miss {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
  }
  .log-entry.write {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
  }
  .log-entry.flush {
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.2);
  }
  .log-entry.invalidate {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
  .log-entry.crash {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  .log-entry.bump {
    background: rgba(236, 72, 153, 0.1);
    border: 1px solid rgba(236, 72, 153, 0.2);
  }

  .badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .hit .badge { background: rgba(0, 212, 255, 0.2); color: #00d4ff; }
  .miss .badge { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
  .write .badge { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
  .flush .badge { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
  .invalidate .badge { background: rgba(16, 185, 129, 0.2); color: #10b981; }
  .crash .badge { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
  .bump .badge { background: rgba(236, 72, 153, 0.2); color: #ec4899; }

  .key {
    flex: 1;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .time {
    font-size: 0.7rem;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .empty {
    padding: 1rem;
    text-align: center;
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  .log-entries::-webkit-scrollbar {
    width: 4px;
  }

  .log-entries::-webkit-scrollbar-track {
    background: transparent;
  }

  .log-entries::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }
</style>
