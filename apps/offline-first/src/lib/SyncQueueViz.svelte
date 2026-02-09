<script>
let { queue } = $props();

let newNoteText = $state("");

function handleAdd() {
  const text = newNoteText.trim();
  if (!text) return;
  queue.addNote(text);
  newNoteText = "";
}

function handleKeydown(e) {
  if (e.key === "Enter") handleAdd();
}
</script>

<div class="viz sync-queue-viz">
  <h3>Sync Queue (Local-First)</h3>
  <p class="description">
    Writes go to local store instantly. Mutations queue up and sync to the server when online.
  </p>

  <div class="add-note-row">
    <input
      type="text"
      placeholder="Add a note..."
      bind:value={newNoteText}
      onkeydown={handleKeydown}
    />
    <button class="add-btn" onclick={handleAdd}>Add</button>
  </div>

  <div class="three-col">
    <!-- Local Store -->
    <div class="col">
      <div class="col-header">
        <span class="col-title">Local Store</span>
        <span class="col-count">{queue.localItems.length}</span>
      </div>
      <div class="col-items">
        {#each queue.localItems as note (note.id)}
          <div class="note-item">
            <span class="note-text">{note.text}</span>
            <div class="note-actions">
              <button
                class="note-btn edit"
                onclick={() => {
                  const newText = note.text + " (edited)";
                  queue.editNote(note.id, newText);
                }}
                title="Edit"
              >{"\u270E"}</button>
              <button
                class="note-btn del"
                onclick={() => queue.deleteNote(note.id)}
                title="Delete"
              >{"\u2717"}</button>
            </div>
          </div>
        {/each}
        {#if queue.localItems.length === 0}
          <div class="empty-col">No notes</div>
        {/if}
      </div>
    </div>

    <!-- Mutation Queue -->
    <div class="col queue-col">
      <div class="col-header">
        <span class="col-title">Mutation Queue</span>
        <span class="col-count">{queue.mutationQueue.length}</span>
      </div>
      <div class="col-items">
        {#each queue.mutationQueue as mut (mut.id)}
          <div class="mutation-item" class:syncing={mut.status === "syncing"} class:failed={mut.status === "failed"}>
            <span class="mut-badge" class:create={mut.type === "create"} class:update={mut.type === "update"} class:delete={mut.type === "delete"}>
              {mut.type}
            </span>
            <span class="mut-payload">{mut.payload.text || mut.payload.id}</span>
            {#if mut.status === "syncing"}
              <span class="mut-status syncing-status">syncing...</span>
            {:else if mut.status === "failed"}
              <span class="mut-status failed-status">failed</span>
            {/if}
          </div>
        {/each}
        {#if queue.mutationQueue.length === 0}
          <div class="empty-col">Queue empty</div>
        {/if}
      </div>
    </div>

    <!-- Server Store -->
    <div class="col">
      <div class="col-header">
        <span class="col-title">Server Store</span>
        <span class="col-count">{queue.serverItems.length}</span>
      </div>
      <div class="col-items">
        {#each queue.serverItems as note (note.id)}
          <div class="note-item server-note">
            <span class="note-text">{note.text}</span>
          </div>
        {/each}
        {#if queue.serverItems.length === 0}
          <div class="empty-col">Not synced</div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .sync-queue-viz {
    text-align: left;
  }

  .add-note-row {
    display: flex;
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .add-note-row input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    font-size: 0.8rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .add-note-row input:focus {
    border-color: var(--color-accent);
  }

  .add-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #1456d0, #1a6dff);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .add-btn:hover {
    box-shadow: 0 0 16px rgba(26, 109, 255, 0.5);
  }

  .three-col {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .col-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid var(--color-border);
  }

  .col-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  .col-count {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-accent-cyan);
    background: rgba(0, 212, 255, 0.1);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .col-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 280px;
    overflow-y: auto;
  }

  .note-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.2);
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .server-note {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.2);
  }

  .note-text {
    flex: 1;
    color: var(--color-text);
    font-weight: 500;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .note-btn {
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .note-btn.edit:hover { color: #8b5cf6; background: rgba(139, 92, 246, 0.15); }
  .note-btn.del:hover { color: #ef4444; background: rgba(239, 68, 68, 0.15); }

  .mutation-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    background: rgba(245, 158, 11, 0.06);
    border: 1px solid rgba(245, 158, 11, 0.2);
    animation: slideIn 0.2s ease;
    transition: all 0.3s ease;
  }

  .mutation-item.syncing {
    border-color: rgba(0, 212, 255, 0.4);
    background: rgba(0, 212, 255, 0.08);
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.2);
  }

  .mutation-item.failed {
    border-color: rgba(239, 68, 68, 0.4);
    background: rgba(239, 68, 68, 0.08);
  }

  .mut-badge {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .mut-badge.create { color: #22c55e; background: rgba(34, 197, 94, 0.15); }
  .mut-badge.update { color: #8b5cf6; background: rgba(139, 92, 246, 0.15); }
  .mut-badge.delete { color: #ef4444; background: rgba(239, 68, 68, 0.15); }

  .mut-payload {
    flex: 1;
    color: var(--color-text);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mut-status {
    font-size: 0.6rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .syncing-status { color: #00d4ff; }
  .failed-status { color: #ef4444; }

  .empty-col {
    text-align: center;
    font-size: 0.75rem;
    color: var(--color-muted);
    padding: 1.5rem 0;
    opacity: 0.6;
  }

  .col-items::-webkit-scrollbar { width: 3px; }
  .col-items::-webkit-scrollbar-track { background: transparent; }
  .col-items::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
</style>
