<script>
  let { log = [] } = $props();

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 1000) return 'just now';
    return `${(diff / 1000).toFixed(1)}s ago`;
  }
</script>

<div class="log-panel">
  <h4>Request Log</h4>
  <div class="log-entries">
    {#each log as entry (entry.id)}
      <div class="log-entry" class:accepted={entry.accepted} class:rejected={!entry.accepted}>
        <span class="status-icon">{entry.accepted ? '  ' : '  '}</span>
        <span class="status-text">{entry.accepted ? '200 OK' : '429 Too Many Requests'}</span>
        <span class="time">{timeAgo(entry.time)}</span>
      </div>
    {/each}
    {#if log.length === 0}
      <div class="empty">No requests yet. Click "Send Request" to start!</div>
    {/if}
  </div>
</div>

<style>
  .log-panel {
    margin-top: 1rem;
  }

  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .log-entries {
    max-height: 200px;
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
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .log-entry.accepted {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .log-entry.rejected {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .status-icon {
    font-size: 1rem;
  }

  .status-text {
    font-weight: 600;
    flex: 1;
  }

  .accepted .status-text { color: #22c55e; }
  .rejected .status-text { color: #ef4444; }

  .time {
    font-size: 0.7rem;
    color: var(--color-muted);
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
