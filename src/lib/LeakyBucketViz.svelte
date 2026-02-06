<script>
  let { limiter } = $props();
</script>

<div class="viz leaky-bucket-viz">
  <h3>Leaky Bucket</h3>
  <p class="description">
    Requests fill a queue that "leaks" (drains) at a constant rate. If the
    queue is full, new requests are rejected. Smooths out burst traffic.
  </p>

  <div class="bucket-container">
    <div class="bucket">
      <div class="water" style="height: {(limiter.queue / limiter.maxQueue) * 100}%"></div>
      <div class="queue-count">{limiter.queue} / {limiter.maxQueue}</div>
      <div class="drain-indicator">drains 1 every {(1000 / limiter.rate).toFixed(0)}ms</div>
    </div>
    <div class="drip">
      {#if limiter.queue > 0}
        <div class="drip-drop"></div>
      {/if}
    </div>
    <div class="bucket-label">Queue</div>
  </div>

  <div class="meter">
    <div
      class="meter-fill"
      class:danger={limiter.queue >= limiter.maxQueue}
      style="width: {(limiter.queue / limiter.maxQueue) * 100}%"
    ></div>
  </div>
</div>

<style>
  .leaky-bucket-viz {
    text-align: center;
  }

  .bucket-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 1.5rem 0;
  }

  .bucket {
    width: 120px;
    height: 160px;
    border: 3px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 16px 16px;
    position: relative;
    overflow: hidden;
    background: var(--color-surface);
  }

  .water {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, #f59e0b, #fbbf24);
    transition: height 0.3s ease;
    border-radius: 0 0 13px 13px;
  }

  .queue-count {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.2rem;
    color: white;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
    z-index: 1;
  }

  .drain-indicator {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.7rem;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .drip {
    width: 3px;
    height: 20px;
    position: relative;
  }

  .drip-drop {
    width: 6px;
    height: 6px;
    background: #f59e0b;
    border-radius: 50%;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    animation: dripping 0.6s ease-in infinite;
  }

  @keyframes dripping {
    0% { top: 0; opacity: 1; }
    100% { top: 20px; opacity: 0; }
  }

  .bucket-label {
    margin-top: 0.25rem;
    font-size: 0.85rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .meter {
    height: 8px;
    background: var(--color-surface);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .meter-fill {
    height: 100%;
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
    transition: width 0.3s ease;
    border-radius: 4px;
  }

  .meter-fill.danger {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }
</style>
