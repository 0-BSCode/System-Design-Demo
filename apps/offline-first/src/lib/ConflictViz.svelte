<script>
let { resolver } = $props();
</script>

<div class="viz conflict-viz">
  <h3>Conflict Resolution</h3>
  <p class="description">
    Two clients edit the same document. Conflicts are resolved using the selected strategy when syncing.
  </p>

  <div class="strategy-badge">
    Strategy: <strong>{resolver.strategy === "lww" ? "Last-Write-Wins" : "CRDT (LWW-Register)"}</strong>
  </div>

  <div class="three-col">
    <!-- Client A -->
    <div class="client-col">
      <div class="client-header">
        <span class="client-label">Client A</span>
        <span class="online-badge" class:online={resolver.clientA.online} class:offline={!resolver.clientA.online}>
          {resolver.clientA.online ? "Online" : "Offline"}
        </span>
      </div>
      <div class="client-fields">
        {#each resolver.docKeys as key (key)}
          <label class="field">
            <span class="field-key">{key}</span>
            <input
              type="text"
              value={resolver.clientA.doc[key]}
              oninput={(e) => resolver.editClient("A", key, e.target.value)}
            />
          </label>
        {/each}
      </div>
      <div class="client-meta">
        <span class="pending-count">{resolver.clientA.pendingEdits.length} pending</span>
        <span class="clock">Clock: [{resolver.clientA.clock.A}, {resolver.clientA.clock.B}]</span>
      </div>
      <div class="client-actions">
        <button class="toggle-btn" onclick={() => resolver.toggleClient("A")}>
          {resolver.clientA.online ? "Go Offline" : "Go Online"}
        </button>
        <button
          class="sync-btn"
          onclick={() => resolver.syncClient("A")}
          disabled={resolver.clientA.pendingEdits.length === 0}
        >
          Sync
        </button>
      </div>
    </div>

    <!-- Server -->
    <div class="server-col">
      <div class="client-header">
        <span class="client-label server-label">Server</span>
      </div>
      <div class="server-fields">
        {#each resolver.docKeys as key (key)}
          {@const conflict = resolver.conflicts.find(c => c.key === key)}
          <div class="server-field" class:conflicted={conflict}>
            <span class="field-key">{key}</span>
            <span class="field-value">{resolver.serverDoc[key]}</span>
            {#if conflict}
              <span class="conflict-indicator" title="{conflict.winner} wins">
                {"\u26A1"} {conflict.winner}
              </span>
            {/if}
          </div>
        {/each}
      </div>

      {#if resolver.conflicts.length > 0}
        <div class="conflict-log">
          <span class="conflict-log-title">Recent Conflicts</span>
          {#each resolver.conflicts.slice(0, 5) as c (c.id)}
            <div class="conflict-entry">
              <span class="conflict-key">{c.key}</span>
              <span class="conflict-detail">
                A: "{c.editA.value}" vs B: "{c.editB.value}"
              </span>
              <span class="conflict-winner">{c.winner}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Client B -->
    <div class="client-col">
      <div class="client-header">
        <span class="client-label">Client B</span>
        <span class="online-badge" class:online={resolver.clientB.online} class:offline={!resolver.clientB.online}>
          {resolver.clientB.online ? "Online" : "Offline"}
        </span>
      </div>
      <div class="client-fields">
        {#each resolver.docKeys as key (key)}
          <label class="field">
            <span class="field-key">{key}</span>
            <input
              type="text"
              value={resolver.clientB.doc[key]}
              oninput={(e) => resolver.editClient("B", key, e.target.value)}
            />
          </label>
        {/each}
      </div>
      <div class="client-meta">
        <span class="pending-count">{resolver.clientB.pendingEdits.length} pending</span>
        <span class="clock">Clock: [{resolver.clientB.clock.A}, {resolver.clientB.clock.B}]</span>
      </div>
      <div class="client-actions">
        <button class="toggle-btn" onclick={() => resolver.toggleClient("B")}>
          {resolver.clientB.online ? "Go Offline" : "Go Online"}
        </button>
        <button
          class="sync-btn"
          onclick={() => resolver.syncClient("B")}
          disabled={resolver.clientB.pendingEdits.length === 0}
        >
          Sync
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .conflict-viz {
    text-align: left;
  }

  .strategy-badge {
    font-size: 0.78rem;
    color: var(--color-muted);
    margin-bottom: 0.75rem;
    padding: 0.35rem 0.6rem;
    background: rgba(139, 92, 246, 0.08);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 6px;
    display: inline-block;
  }

  .strategy-badge strong {
    color: #8b5cf6;
  }

  .three-col {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .client-col, .server-col {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .client-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid var(--color-border);
  }

  .client-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  .server-label {
    color: var(--color-accent-cyan);
  }

  .online-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .online-badge.online {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.15);
  }

  .online-badge.offline {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.15);
  }

  .client-fields {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .field-key {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .field input {
    padding: 0.35rem 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-size: 0.78rem;
    outline: none;
    transition: border-color 0.2s;
    width: 100%;
  }

  .field input:focus {
    border-color: var(--color-accent);
  }

  .client-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    color: var(--color-muted);
  }

  .pending-count {
    color: #f59e0b;
  }

  .client-actions {
    display: flex;
    gap: 0.35rem;
  }

  .toggle-btn {
    flex: 1;
    padding: 0.35rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    color: var(--color-muted);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toggle-btn:hover {
    color: var(--color-text);
    border-color: var(--color-text);
  }

  .sync-btn {
    flex: 1;
    padding: 0.35rem;
    background: linear-gradient(135deg, #1456d0, #1a6dff);
    border: none;
    border-radius: 5px;
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sync-btn:hover:not(:disabled) {
    box-shadow: 0 0 12px rgba(26, 109, 255, 0.5);
  }

  .sync-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Server column */

  .server-fields {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .server-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0.35rem 0.5rem;
    background: rgba(0, 212, 255, 0.04);
    border: 1px solid rgba(0, 212, 255, 0.15);
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .server-field.conflicted {
    border-color: rgba(239, 68, 68, 0.4);
    background: rgba(239, 68, 68, 0.06);
    animation: conflictPulse 0.5s ease;
  }

  @keyframes conflictPulse {
    0%, 100% { box-shadow: none; }
    50% { box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); }
  }

  .server-field .field-value {
    font-size: 0.78rem;
    color: var(--color-text);
    font-weight: 500;
  }

  .conflict-indicator {
    font-size: 0.6rem;
    color: #ef4444;
    font-weight: 600;
  }

  .conflict-log {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.04);
    border: 1px solid rgba(239, 68, 68, 0.15);
    border-radius: 6px;
  }

  .conflict-log-title {
    display: block;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #ef4444;
    margin-bottom: 0.3rem;
  }

  .conflict-entry {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 3px 0;
    font-size: 0.65rem;
    border-bottom: 1px solid rgba(239, 68, 68, 0.1);
  }

  .conflict-entry:last-child {
    border-bottom: none;
  }

  .conflict-key {
    font-weight: 600;
    color: var(--color-text);
  }

  .conflict-detail {
    color: var(--color-muted);
  }

  .conflict-winner {
    color: #22c55e;
    font-weight: 600;
  }
</style>
