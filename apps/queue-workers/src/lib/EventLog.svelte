<script>
let { log = [] } = $props();

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 1000) return "just now";
  return `${(diff / 1000).toFixed(1)}s ago`;
}

const icons = {
  enqueue: "+",
  process: "\u25B6",
  complete: "\u2713",
  fail: "\u2717",
  retry: "\u21BB",
  dlq: "\u2620",
  publish: "\u25B2",
  consume: "\u25BC",
  ack: "\u2713",
  promote: "\u2191",
  info: "\u2022",
};
</script>

<div class="log-panel">
  <h4>Event Log</h4>
  <div class="log-entries">
    {#each log as entry (entry.id)}
      <div class="log-entry {entry.type}">
        <span class="status-icon">{icons[entry.type] || "\u2022"}</span>
        <span class="status-text">{entry.message}</span>
        <span class="time">{timeAgo(entry.time)}</span>
      </div>
    {/each}
    {#if log.length === 0}
      <div class="empty">No events yet. Add a job to get started!</div>
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
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    animation: slideIn 0.2s ease;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .log-entry.enqueue { border-color: rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.06); }
  .log-entry.complete, .log-entry.ack { border-color: rgba(34, 197, 94, 0.2); background: rgba(34, 197, 94, 0.06); }
  .log-entry.fail, .log-entry.dlq { border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.06); }
  .log-entry.retry { border-color: rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.06); }
  .log-entry.promote { border-color: rgba(168, 85, 247, 0.2); background: rgba(168, 85, 247, 0.06); }
  .log-entry.publish { border-color: rgba(59, 130, 246, 0.15); background: rgba(59, 130, 246, 0.04); }
  .log-entry.consume, .log-entry.process { border-color: rgba(0, 212, 255, 0.15); background: rgba(0, 212, 255, 0.04); }

  .status-icon {
    font-size: 0.8rem;
    flex-shrink: 0;
    width: 14px;
    text-align: center;
  }

  .complete .status-icon, .ack .status-icon { color: #22c55e; }
  .fail .status-icon, .dlq .status-icon { color: #ef4444; }
  .retry .status-icon { color: #f59e0b; }
  .promote .status-icon { color: #a855f7; }
  .enqueue .status-icon, .publish .status-icon { color: #3b82f6; }
  .process .status-icon, .consume .status-icon { color: #00d4ff; }

  .status-text {
    flex: 1;
    color: var(--color-text);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .time {
    font-size: 0.65rem;
    color: var(--color-muted);
    flex-shrink: 0;
  }

  .empty {
    padding: 1rem;
    text-align: center;
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  .log-entries::-webkit-scrollbar { width: 4px; }
  .log-entries::-webkit-scrollbar-track { background: transparent; }
  .log-entries::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
</style>
