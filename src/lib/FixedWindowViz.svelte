<script>
  import { onMount, onDestroy } from 'svelte';

  let { limiter } = $props();
  let progress = $state(0);
  let frameId;

  function tick() {
    progress = limiter.getWindowProgress();
    frameId = requestAnimationFrame(tick);
  }

  onMount(() => { frameId = requestAnimationFrame(tick); });
  onDestroy(() => { if (frameId) cancelAnimationFrame(frameId); });
</script>

<div class="viz fixed-window-viz">
  <h3>Fixed Window</h3>
  <p class="description">
    Requests are counted within fixed time windows. The counter resets
    when the window expires. Can allow bursts at window boundaries.
  </p>

  <div class="window-container">
    <div class="window-bar">
      <div class="window-progress" style="width: {progress * 100}%"></div>
      <span class="window-label">Window: {(limiter.windowSize / 1000).toFixed(1)}s</span>
    </div>

    <div class="slots">
      {#each Array(limiter.limit) as _, i (i)}
        <div class="slot" class:filled={i < limiter.count}></div>
      {/each}
    </div>
    <div class="counter">{limiter.count} / {limiter.limit} requests</div>
  </div>

  <div class="meter">
    <div
      class="meter-fill"
      class:danger={limiter.count >= limiter.limit}
      style="width: {(limiter.count / limiter.limit) * 100}%"
    ></div>
  </div>
</div>

<style>
  .fixed-window-viz {
    text-align: center;
  }

  .window-container {
    margin: 1.5rem 0;
  }

  .window-bar {
    height: 32px;
    background: var(--color-surface);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    margin-bottom: 1rem;
    border: 1px solid var(--color-border);
  }

  .window-progress {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    transition: width 0.1s linear;
    opacity: 0.3;
  }

  .window-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .slots {
    display: flex;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .slot {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 2px solid var(--color-border);
    background: var(--color-surface);
    transition: all 0.2s ease;
  }

  .slot.filled {
    background: #8b5cf6;
    border-color: #7c3aed;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }

  .counter {
    font-size: 0.9rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .meter {
    height: 8px;
    background: var(--color-surface);
    border-radius: 4px;
    overflow: hidden;
  }

  .meter-fill {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    transition: width 0.3s ease;
    border-radius: 4px;
  }

  .meter-fill.danger {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }
</style>
