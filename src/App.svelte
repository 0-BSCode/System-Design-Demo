<script>
  import { onDestroy } from 'svelte';
  import {
    createTokenBucket,
    createFixedWindow,
    createSlidingWindowLog,
    createLeakyBucket,
  } from './lib/rateLimiters.svelte.js';

  import TokenBucketViz from './lib/TokenBucketViz.svelte';
  import FixedWindowViz from './lib/FixedWindowViz.svelte';
  import SlidingWindowViz from './lib/SlidingWindowViz.svelte';
  import LeakyBucketViz from './lib/LeakyBucketViz.svelte';
  import RequestLog from './lib/RequestLog.svelte';

  const algorithms = [
    { id: 'token-bucket', label: 'Token Bucket', color: '#3b82f6' },
    { id: 'fixed-window', label: 'Fixed Window', color: '#8b5cf6' },
    { id: 'sliding-window', label: 'Sliding Window', color: '#10b981' },
    { id: 'leaky-bucket', label: 'Leaky Bucket', color: '#f59e0b' },
  ];

  let selected = $state('token-bucket');
  let flash = $state(null);
  let autoSend = $state(false);
  let autoIntervalId = null;
  let autoRate = $state(5);

  let tokenBucket = createTokenBucket(10, 2);
  let fixedWindow = createFixedWindow(5, 5000);
  let slidingWindow = createSlidingWindowLog(5, 5000);
  let leakyBucket = createLeakyBucket(10, 2);

  let limiter = $derived.by(() => {
    switch (selected) {
      case 'token-bucket': return tokenBucket;
      case 'fixed-window': return fixedWindow;
      case 'sliding-window': return slidingWindow;
      case 'leaky-bucket': return leakyBucket;
      default: return tokenBucket;
    }
  });

  let stats = $derived.by(() => {
    const log = limiter.log;
    const total = log.length;
    const accepted = log.filter(e => e.accepted).length;
    const rejected = total - accepted;
    const rate = total > 0 ? ((accepted / total) * 100).toFixed(1) : '0.0';
    return { total, accepted, rejected, rate };
  });

  function sendRequest() {
    const result = limiter.tryRequest();
    flash = result ? 'accepted' : 'rejected';
    setTimeout(() => { flash = null; }, 300);
  }

  function toggleAutoSend() {
    autoSend = !autoSend;
    if (autoSend) {
      autoIntervalId = setInterval(sendRequest, 1000 / autoRate);
    } else {
      if (autoIntervalId) clearInterval(autoIntervalId);
      autoIntervalId = null;
    }
  }

  function updateAutoRate(newRate) {
    autoRate = newRate;
    if (autoSend) {
      if (autoIntervalId) clearInterval(autoIntervalId);
      autoIntervalId = setInterval(sendRequest, 1000 / autoRate);
    }
  }

  function resetAll() {
    limiter.reset();
    autoSend = false;
    if (autoIntervalId) clearInterval(autoIntervalId);
    autoIntervalId = null;
  }

  function switchAlgorithm(id) {
    autoSend = false;
    if (autoIntervalId) clearInterval(autoIntervalId);
    autoIntervalId = null;
    selected = id;
  }

  onDestroy(() => {
    tokenBucket.destroy();
    fixedWindow.destroy();
    slidingWindow.destroy();
    leakyBucket.destroy();
    if (autoIntervalId) clearInterval(autoIntervalId);
  });
</script>

<main>
  <header>
    <h1>HTTP Rate Limiter</h1>
    <p class="subtitle">Interactive visualization of common rate limiting algorithms</p>
  </header>

  <nav class="algorithm-tabs">
    {#each algorithms as algo (algo.id)}
      <button
        class="tab"
        class:active={selected === algo.id}
        style="--tab-color: {algo.color}"
        onclick={() => switchAlgorithm(algo.id)}
      >
        {algo.label}
      </button>
    {/each}
  </nav>

  <div class="content">
    <div class="viz-panel" class:flash-accepted={flash === 'accepted'} class:flash-rejected={flash === 'rejected'}>
      {#if selected === 'token-bucket'}
        <TokenBucketViz {limiter} />
      {:else if selected === 'fixed-window'}
        <FixedWindowViz {limiter} />
      {:else if selected === 'sliding-window'}
        <SlidingWindowViz {limiter} />
      {:else if selected === 'leaky-bucket'}
        <LeakyBucketViz {limiter} />
      {/if}
    </div>

    <div class="controls-panel">
      <div class="send-section">
        <button class="send-btn" onclick={sendRequest}>
          Send Request
        </button>

        <div class="auto-send">
          <button
            class="auto-btn"
            class:active={autoSend}
            onclick={toggleAutoSend}
          >
            {autoSend ? 'Stop Auto' : 'Auto Send'}
          </button>
          <label class="rate-control">
            <span>{autoRate} req/s</span>
            <input
              type="range"
              min="1"
              max="20"
              value={autoRate}
              oninput={(e) => updateAutoRate(Number(e.target.value))}
            />
          </label>
        </div>

        <button class="reset-btn" onclick={resetAll}>Reset</button>
      </div>

      <div class="config-section">
        <h4>Configuration</h4>
        {#if selected === 'token-bucket'}
          <label>
            <span>Bucket Size: {tokenBucket.maxTokens}</span>
            <input type="range" min="1" max="20" value={tokenBucket.maxTokens}
              oninput={(e) => tokenBucket.setCapacity(Number(e.target.value))} />
          </label>
          <label>
            <span>Refill Rate: {tokenBucket.rate}/s</span>
            <input type="range" min="1" max="10" value={tokenBucket.rate}
              oninput={(e) => tokenBucket.setRate(Number(e.target.value))} />
          </label>
        {:else if selected === 'fixed-window'}
          <label>
            <span>Max Requests: {fixedWindow.limit}</span>
            <input type="range" min="1" max="20" value={fixedWindow.limit}
              oninput={(e) => fixedWindow.setLimit(Number(e.target.value))} />
          </label>
          <label>
            <span>Window: {(fixedWindow.windowSize / 1000).toFixed(1)}s</span>
            <input type="range" min="1000" max="15000" step="1000" value={fixedWindow.windowSize}
              oninput={(e) => fixedWindow.setWindowSize(Number(e.target.value))} />
          </label>
        {:else if selected === 'sliding-window'}
          <label>
            <span>Max Requests: {slidingWindow.limit}</span>
            <input type="range" min="1" max="20" value={slidingWindow.limit}
              oninput={(e) => slidingWindow.setLimit(Number(e.target.value))} />
          </label>
          <label>
            <span>Window: {(slidingWindow.windowSize / 1000).toFixed(1)}s</span>
            <input type="range" min="1000" max="15000" step="1000" value={slidingWindow.windowSize}
              oninput={(e) => slidingWindow.setWindowSize(Number(e.target.value))} />
          </label>
        {:else if selected === 'leaky-bucket'}
          <label>
            <span>Queue Size: {leakyBucket.maxQueue}</span>
            <input type="range" min="1" max="20" value={leakyBucket.maxQueue}
              oninput={(e) => leakyBucket.setCapacity(Number(e.target.value))} />
          </label>
          <label>
            <span>Drain Rate: {leakyBucket.rate}/s</span>
            <input type="range" min="1" max="10" value={leakyBucket.rate}
              oninput={(e) => leakyBucket.setRate(Number(e.target.value))} />
          </label>
        {/if}
      </div>

      <div class="stats-section">
        <h4>Stats</h4>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-value">{stats.total}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat accepted">
            <span class="stat-value">{stats.accepted}</span>
            <span class="stat-label">Accepted</span>
          </div>
          <div class="stat rejected">
            <span class="stat-value">{stats.rejected}</span>
            <span class="stat-label">Rejected</span>
          </div>
          <div class="stat">
            <span class="stat-value">{stats.rate}%</span>
            <span class="stat-label">Success</span>
          </div>
        </div>
      </div>

      <RequestLog log={limiter.log} />
    </div>
  </div>

  <footer>
    <div class="how-it-works">
      <h3>How HTTP Rate Limiting Works</h3>
      <p>
        Rate limiting controls the number of requests a client can make to a server within a given timeframe.
        When a request exceeds the limit, the server responds with <code>429 Too Many Requests</code>.
        Common headers include <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>,
        and <code>Retry-After</code>.
      </p>
    </div>
  </footer>
</main>

<style>
  :global(:root) {
    --color-bg: #0f1117;
    --color-surface: #1a1d2e;
    --color-border: #2a2d3e;
    --color-text: #e2e8f0;
    --color-muted: #8892a8;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    min-height: 100vh;
  }

  :global(*) {
    box-sizing: border-box;
  }

  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    margin: 0 0 0.25rem 0;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6, #10b981);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: var(--color-muted);
    margin: 0;
    font-size: 0.95rem;
  }

  .algorithm-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .tab {
    flex: 1;
    min-width: 120px;
    padding: 0.65rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-muted);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .tab:hover {
    border-color: var(--tab-color);
    color: var(--color-text);
  }

  .tab.active {
    background: color-mix(in srgb, var(--tab-color) 15%, transparent);
    border-color: var(--tab-color);
    color: var(--tab-color);
    box-shadow: 0 0 12px color-mix(in srgb, var(--tab-color) 20%, transparent);
  }

  .content {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 720px) {
    .content {
      grid-template-columns: 1fr;
    }
  }

  .viz-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    transition: box-shadow 0.3s ease;
  }

  .viz-panel.flash-accepted {
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
  }

  .viz-panel.flash-rejected {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
  }

  :global(.viz h3) {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
  }

  :global(.viz .description) {
    color: var(--color-muted);
    font-size: 0.8rem;
    margin: 0 0 0.5rem 0;
    line-height: 1.5;
  }

  .controls-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .send-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .send-btn {
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .send-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .send-btn:active {
    transform: translateY(0);
  }

  .auto-send {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .auto-btn {
    padding: 0.5rem 0.75rem;
    background: var(--color-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .auto-btn.active {
    background: rgba(239, 68, 68, 0.15);
    border-color: #ef4444;
    color: #ef4444;
  }

  .rate-control {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rate-control span {
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  .rate-control input[type="range"] {
    width: 100%;
  }

  .reset-btn {
    padding: 0.5rem;
    background: transparent;
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    color: var(--color-text);
    border-color: var(--color-text);
  }

  .config-section, .stats-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1rem;
  }

  .config-section h4, .stats-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.85rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .config-section label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 0.75rem;
  }

  .config-section label:last-child {
    margin-bottom: 0;
  }

  .config-section label span {
    font-size: 0.8rem;
    color: var(--color-text);
    font-weight: 500;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    outline: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .stat {
    background: var(--color-bg);
    border-radius: 8px;
    padding: 0.5rem;
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat.accepted .stat-value { color: #22c55e; }
  .stat.rejected .stat-value { color: #ef4444; }

  footer {
    margin-top: 2rem;
  }

  .how-it-works {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .how-it-works h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.95rem;
  }

  .how-it-works p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-muted);
    line-height: 1.6;
  }

  .how-it-works code {
    background: var(--color-bg);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
    color: #a78bfa;
  }
</style>
