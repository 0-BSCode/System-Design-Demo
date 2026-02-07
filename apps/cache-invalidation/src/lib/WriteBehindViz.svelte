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

function queueAge(entry) {
  return ((now - entry.queuedAt) / 1000).toFixed(1);
}
</script>

<div class="viz wb-viz" class:crashed={strategy.crashed}>
  <h3>Write-Behind (Write-Back)</h3>
  <p class="description">
    Writes update cache immediately and queue DB updates for later. Faster writes,
    but risk data loss if the system crashes before flushing.
  </p>

  {#if strategy.crashed}
    <div class="crash-overlay">
      <div class="crash-icon">SYSTEM CRASH</div>
      <div class="crash-text">Dirty writes lost! Click "Recover" to restart.</div>
    </div>
  {/if}

  <div class="tiers">
    <div class="tier cache-tier">
      <div class="tier-header">Cache</div>
      <div class="tier-entries">
        {#each strategy.cache as entry (entry.key)}
          <div class="tier-entry">
            <span class="entry-key">{entry.key}</span>
            <span class="entry-val">{entry.value}</span>
          </div>
        {/each}
        {#if strategy.cache.length === 0}
          <div class="tier-empty">Empty</div>
        {/if}
      </div>
    </div>

    <div class="tier-arrow">
      <div class="arrow-down"></div>
    </div>

    <div class="tier queue-tier">
      <div class="tier-header">
        Dirty Queue
        {#if strategy.dirtyQueue.length > 0}
          <span class="queue-count">({strategy.dirtyQueue.length})</span>
        {/if}
        {#if strategy.isFlushing}
          <span class="flushing-badge">FLUSHING</span>
        {/if}
      </div>
      <div class="tier-entries">
        {#each strategy.dirtyQueue as entry (entry.key)}
          <div class="tier-entry dirty">
            <span class="entry-key">{entry.key}</span>
            <span class="entry-val">{entry.value}</span>
            <span class="age">{queueAge(entry)}s</span>
          </div>
        {/each}
        {#if strategy.dirtyQueue.length === 0}
          <div class="tier-empty">No pending writes</div>
        {/if}
      </div>
    </div>

    <div class="tier-arrow">
      <div class="arrow-down" class:flushing={strategy.isFlushing}></div>
    </div>

    <div class="tier db-tier">
      <div class="tier-header">Database</div>
      <div class="tier-entries">
        {#each strategy.db as entry (entry.key)}
          <div class="tier-entry">
            <span class="entry-key">{entry.key}</span>
            <span class="entry-val">{entry.value}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .wb-viz {
    min-height: 200px;
    position: relative;
  }

  .wb-viz.crashed {
    border-color: rgba(239, 68, 68, 0.3);
  }

  .crash-overlay {
    position: absolute;
    inset: 0;
    background: rgba(239, 68, 68, 0.08);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
  }

  .crash-icon {
    font-size: 1.2rem;
    font-weight: 800;
    color: #ef4444;
    margin-bottom: 0.5rem;
    text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
    animation: crashPulse 1s ease infinite;
  }

  @keyframes crashPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .crash-text {
    font-size: 0.8rem;
    color: #ef4444;
    opacity: 0.8;
  }

  .tiers {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 1rem 0;
  }

  .tier {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
  }

  .tier-header {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    margin-bottom: 0.4rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .cache-tier .tier-header { color: #00d4ff; }
  .queue-tier .tier-header { color: #f59e0b; }
  .db-tier .tier-header { color: #8b5cf6; }

  .queue-count {
    color: #f59e0b;
    font-size: 0.7rem;
  }

  .flushing-badge {
    font-size: 0.55rem;
    padding: 1px 5px;
    background: rgba(139, 92, 246, 0.2);
    color: #8b5cf6;
    border-radius: 3px;
    animation: pulse 0.8s ease infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .tier-entries {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tier-entry {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 5px;
    font-size: 0.72rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .tier-entry.dirty {
    border-color: rgba(245, 158, 11, 0.3);
    background: rgba(245, 158, 11, 0.05);
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

  .age {
    font-size: 0.6rem;
    color: var(--color-muted);
  }

  .tier-empty {
    width: 100%;
    text-align: center;
    padding: 0.5rem;
    color: var(--color-muted);
    font-size: 0.75rem;
  }

  .tier-arrow {
    display: flex;
    justify-content: center;
    padding: 0.25rem 0;
  }

  .arrow-down {
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 10px solid var(--color-border);
  }

  .arrow-down.flushing {
    border-top-color: #8b5cf6;
    animation: pulse 0.5s ease infinite;
  }
</style>
