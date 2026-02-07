<script>
let { limiter } = $props();
</script>

<div class="viz token-bucket-viz">
  <h3>Token Bucket</h3>
  <p class="description">
    Tokens refill at a steady rate. Each request consumes one token.
    If the bucket is empty, requests are rejected until tokens refill.
  </p>

  <div class="bucket-container">
    <div class="bucket">
      <div class="water" style="height: {(limiter.tokens / limiter.maxTokens) * 100}%"></div>
      <div class="token-count">{limiter.tokens} / {limiter.maxTokens}</div>
      <div class="refill-indicator">+1 every {(1000 / limiter.rate).toFixed(0)}ms</div>
    </div>
    <div class="bucket-label">Tokens</div>
  </div>

  <div class="meter">
    <div class="meter-fill" style="width: {(limiter.tokens / limiter.maxTokens) * 100}%"></div>
  </div>
</div>

<style>
  .token-bucket-viz {
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
    background: linear-gradient(to top, #3b82f6, #60a5fa);
    transition: height 0.3s ease;
    border-radius: 0 0 13px 13px;
  }

  .token-count {
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

  .refill-indicator {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.7rem;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .bucket-label {
    margin-top: 0.5rem;
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
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    transition: width 0.3s ease;
    border-radius: 4px;
  }
</style>
