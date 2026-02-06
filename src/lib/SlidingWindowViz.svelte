<script>
  import { onMount, onDestroy } from 'svelte';

  let { limiter } = $props();
  let now = $state(Date.now());
  let frameId;

  function tick() {
    now = Date.now();
    frameId = requestAnimationFrame(tick);
  }

  onMount(() => { frameId = requestAnimationFrame(tick); });
  onDestroy(() => { if (frameId) cancelAnimationFrame(frameId); });

  let activeTimestamps = $derived.by(() => {
    const cutoff = now - limiter.windowSize;
    return limiter.timestamps.filter(t => t > cutoff);
  });

  let dots = $derived.by(() => {
    return activeTimestamps.map(t => {
      const age = now - t;
      const pct = 1 - age / limiter.windowSize;
      return { pct: Math.max(0, Math.min(1, pct)), time: t };
    });
  });
</script>

<div class="viz sliding-window-viz">
  <h3>Sliding Window Log</h3>
  <p class="description">
    Each request timestamp is stored. The window slides continuously with
    time, counting only requests within the last N seconds.
  </p>

  <div class="timeline-container">
    <div class="timeline">
      <div class="timeline-track">
        {#each dots as dot (dot.time)}
          <div
            class="dot"
            style="left: {dot.pct * 100}%; opacity: {0.3 + dot.pct * 0.7}"
          ></div>
        {/each}
      </div>
      <div class="timeline-labels">
        <span>{(limiter.windowSize / 1000).toFixed(0)}s ago</span>
        <span>now</span>
      </div>
    </div>
    <div class="counter">{activeTimestamps.length} / {limiter.limit} in window</div>
  </div>

  <div class="meter">
    <div
      class="meter-fill"
      class:danger={activeTimestamps.length >= limiter.limit}
      style="width: {(activeTimestamps.length / limiter.limit) * 100}%"
    ></div>
  </div>
</div>

<style>
  .sliding-window-viz {
    text-align: center;
  }

  .timeline-container {
    margin: 1.5rem 0;
  }

  .timeline {
    margin-bottom: 0.75rem;
  }

  .timeline-track {
    height: 48px;
    background: var(--color-surface);
    border-radius: 8px;
    position: relative;
    border: 1px solid var(--color-border);
    overflow: hidden;
    background-image: linear-gradient(90deg,
      rgba(16, 185, 129, 0.05) 0%,
      rgba(16, 185, 129, 0.15) 100%
    );
  }

  .dot {
    position: absolute;
    width: 10px;
    height: 10px;
    background: #10b981;
    border-radius: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    transition: left 0.1s linear;
  }

  .timeline-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--color-muted);
    margin-top: 4px;
    padding: 0 4px;
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
    background: linear-gradient(90deg, #10b981, #34d399);
    transition: width 0.3s ease;
    border-radius: 4px;
  }

  .meter-fill.danger {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }
</style>
