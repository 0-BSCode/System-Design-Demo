<script>
import { AppFooter, AppNav } from "@system-design-monorepo/ui";
import { onDestroy } from "svelte";
import FixedWindowViz from "./lib/FixedWindowViz.svelte";
import LeakyBucketViz from "./lib/LeakyBucketViz.svelte";
import RequestLog from "./lib/RequestLog.svelte";
import {
  createFixedWindow,
  createLeakyBucket,
  createSlidingWindowLog,
  createTokenBucket,
} from "./lib/rateLimiters.svelte.js";
import SlidingWindowViz from "./lib/SlidingWindowViz.svelte";
import TokenBucketViz from "./lib/TokenBucketViz.svelte";

const algorithms = [
  { id: "token-bucket", label: "Token Bucket", color: "#3b82f6" },
  { id: "fixed-window", label: "Fixed Window", color: "#8b5cf6" },
  { id: "sliding-window", label: "Sliding Window", color: "#10b981" },
  { id: "leaky-bucket", label: "Leaky Bucket", color: "#f59e0b" },
];

let selected = $state("token-bucket");
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
    case "token-bucket":
      return tokenBucket;
    case "fixed-window":
      return fixedWindow;
    case "sliding-window":
      return slidingWindow;
    case "leaky-bucket":
      return leakyBucket;
    default:
      return tokenBucket;
  }
});

let stats = $derived.by(() => {
  const log = limiter.log;
  const total = log.length;
  const accepted = log.filter((e) => e.accepted).length;
  const rejected = total - accepted;
  const rate = total > 0 ? ((accepted / total) * 100).toFixed(1) : "0.0";
  return { total, accepted, rejected, rate };
});

function sendRequest() {
  const result = limiter.tryRequest();
  flash = result ? "accepted" : "rejected";
  setTimeout(() => {
    flash = null;
  }, 300);
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
  <AppNav current="rate-limiter" />

  <header>
    <h1>HTTP Rate Limiter</h1>
    <p class="subtitle">Interactive visualization of common rate limiting algorithms</p>
  </header>

  <nav class="tab-bar">
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
      <div class="controls-card">
        <div class="send-row">
          <button class="send-btn" onclick={sendRequest}>Send Request</button>
          <button class="reset-btn" onclick={resetAll}>Reset</button>
        </div>

        <div class="auto-send">
          <button
            class="auto-btn"
            class:active={autoSend}
            onclick={toggleAutoSend}
          >
            {autoSend ? 'Stop' : 'Auto'}
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

        <div class="config-divider"></div>

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

      <div class="stats-row">
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

  <AppFooter />
</main>

<style>
  .viz-panel.flash-accepted {
    box-shadow: 0 0 24px rgba(0, 212, 255, 0.4);
  }

  .viz-panel.flash-rejected {
    box-shadow: 0 0 24px rgba(239, 68, 68, 0.35);
  }

  .stat.accepted .stat-value { color: var(--color-success); }
  .stat.rejected .stat-value { color: var(--color-danger); }
</style>
