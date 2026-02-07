<script>
import { onDestroy } from "svelte";
import ApiGatewayViz from "./lib/ApiGatewayViz.svelte";
import LoadBalancerViz from "./lib/LoadBalancerViz.svelte";
import {
  createApiGateway,
  createLoadBalancer,
  createReverseProxy,
} from "./lib/proxyPatterns.svelte.js";
import RequestLog from "./lib/RequestLog.svelte";
import ReverseProxyViz from "./lib/ReverseProxyViz.svelte";

const patterns = [
  { id: "reverse-proxy", label: "Reverse Proxy", color: "#3b82f6" },
  { id: "load-balancer", label: "Load Balancer", color: "#8b5cf6" },
  { id: "api-gateway", label: "API Gateway", color: "#10b981" },
];

let selected = $state("reverse-proxy");
let flash = $state(null);
let autoSend = $state(false);
let autoIntervalId = null;
let autoRate = $state(3);

let reverseProxy = createReverseProxy();
let loadBalancer = createLoadBalancer("round-robin");
let apiGateway = createApiGateway();

// Path selection per tab
let rpPath = $state("/api");
let gwPath = $state("/users");

let currentPattern = $derived.by(() => {
  switch (selected) {
    case "reverse-proxy":
      return reverseProxy;
    case "load-balancer":
      return loadBalancer;
    case "api-gateway":
      return apiGateway;
    default:
      return reverseProxy;
  }
});

let stats = $derived.by(() => {
  return currentPattern.stats;
});

function sendRequest() {
  switch (selected) {
    case "reverse-proxy":
      reverseProxy.sendRequest(rpPath);
      break;
    case "load-balancer":
      loadBalancer.sendRequest();
      break;
    case "api-gateway":
      apiGateway.sendRequest(gwPath);
      break;
  }
  flash = "sent";
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
  currentPattern.reset();
  autoSend = false;
  if (autoIntervalId) clearInterval(autoIntervalId);
  autoIntervalId = null;
}

function switchPattern(id) {
  autoSend = false;
  if (autoIntervalId) clearInterval(autoIntervalId);
  autoIntervalId = null;
  selected = id;
}

onDestroy(() => {
  reverseProxy.destroy();
  loadBalancer.destroy();
  apiGateway.destroy();
  if (autoIntervalId) clearInterval(autoIntervalId);
});
</script>

<main>
  <nav class="app-nav">
    <a class="app-link" href="/rate-limiter/">Rate Limiter</a>
    <a class="app-link" href="/cache-invalidation/">Cache Invalidation</a>
    <a class="app-link current" href="/proxy-patterns/">Proxy Patterns</a>
  </nav>

  <header>
    <h1>Proxy Patterns</h1>
    <p class="subtitle">Interactive visualization of reverse proxy, load balancer &amp; API gateway</p>
  </header>

  <nav class="algorithm-tabs">
    {#each patterns as pattern (pattern.id)}
      <button
        class="tab"
        class:active={selected === pattern.id}
        style="--tab-color: {pattern.color}"
        onclick={() => switchPattern(pattern.id)}
      >
        {pattern.label}
      </button>
    {/each}
  </nav>

  <div class="content">
    <div class="viz-panel" class:flash-sent={flash === 'sent'}>
      {#if selected === 'reverse-proxy'}
        <ReverseProxyViz proxy={reverseProxy} />
      {:else if selected === 'load-balancer'}
        <LoadBalancerViz balancer={loadBalancer} />
      {:else if selected === 'api-gateway'}
        <ApiGatewayViz gateway={apiGateway} />
      {/if}
    </div>

    <div class="controls-panel">
      <div class="controls-card">
        <div class="send-row">
          <button class="send-btn" onclick={sendRequest}>Send Request</button>
          <button class="reset-btn" onclick={resetAll}>Reset</button>
        </div>

        <!-- Path selector for applicable tabs -->
        {#if selected === 'reverse-proxy'}
          <div class="path-selector">
            <span class="path-label">Path:</span>
            <div class="path-buttons">
              {#each reverseProxy.routes as route (route.path)}
                <button
                  class="path-btn"
                  class:active={rpPath === route.path}
                  style="--path-color: {route.color}"
                  onclick={() => rpPath = route.path}
                >
                  {route.path}
                </button>
              {/each}
            </div>
          </div>
        {:else if selected === 'api-gateway'}
          <div class="path-selector">
            <span class="path-label">Path:</span>
            <div class="path-buttons">
              {#each apiGateway.services as service (service.path)}
                <button
                  class="path-btn"
                  class:active={gwPath === service.path}
                  style="--path-color: {service.color}"
                  onclick={() => gwPath = service.path}
                >
                  {service.path}
                </button>
              {/each}
            </div>
          </div>
        {/if}

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
              max="10"
              value={autoRate}
              oninput={(e) => updateAutoRate(Number(e.target.value))}
            />
          </label>
        </div>

        <div class="config-divider"></div>

        <!-- Per-tab config -->
        {#if selected === 'reverse-proxy'}
          <div class="config-section">
            <span class="config-title">Route Mappings</span>
            {#each reverseProxy.routes as route (route.path)}
              <div class="route-display">
                <span class="rd-path">{route.path}</span>
                <span class="rd-arrow">&rarr;</span>
                <span class="rd-service" style="color: {route.color}">{route.service}</span>
              </div>
            {/each}
          </div>
        {:else if selected === 'load-balancer'}
          <div class="config-section">
            <span class="config-title">Algorithm</span>
            <div class="algo-toggle">
              <button
                class="algo-btn"
                class:active={loadBalancer.algorithm === 'round-robin'}
                onclick={() => loadBalancer.setAlgorithm('round-robin')}
              >
                Round Robin
              </button>
              <button
                class="algo-btn"
                class:active={loadBalancer.algorithm === 'least-connections'}
                onclick={() => loadBalancer.setAlgorithm('least-connections')}
              >
                Least Conn
              </button>
            </div>
          </div>
          <label>
            <span>Instances: {loadBalancer.instances.length}</span>
            <input type="range" min="1" max="5" value={loadBalancer.instances.length}
              oninput={(e) => loadBalancer.setInstanceCount(Number(e.target.value))} />
          </label>
        {:else if selected === 'api-gateway'}
          <div class="config-section">
            <span class="config-title">Middleware Pipeline</span>
            {#each apiGateway.pipeline as step (step.id)}
              <label class="middleware-toggle">
                <input type="checkbox" checked={step.enabled}
                  onchange={() => apiGateway.toggleMiddleware(step.id)} />
                <span style="color: {step.color}">{step.name}</span>
              </label>
            {/each}
          </div>
        {/if}
      </div>

      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">{stats.total}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat routed">
          <span class="stat-value">{stats.routed}</span>
          <span class="stat-label">Routed</span>
        </div>
        {#if selected === 'reverse-proxy'}
          <div class="stat failed">
            <span class="stat-value">{stats.failed}</span>
            <span class="stat-label">Failed</span>
          </div>
        {:else if selected === 'api-gateway'}
          <div class="stat failed">
            <span class="stat-value">{stats.authFailed}</span>
            <span class="stat-label">Auth Fail</span>
          </div>
          <div class="stat limited">
            <span class="stat-value">{stats.rateLimited}</span>
            <span class="stat-label">Limited</span>
          </div>
        {/if}
      </div>

      <RequestLog log={currentPattern.log} />
    </div>
  </div>

  <footer>
    <div class="how-it-works">
      <h3>Understanding Proxy Patterns</h3>
      <p>
        A <strong>Reverse Proxy</strong> routes requests to different backend services based on
        the URL path. A <strong>Load Balancer</strong> distributes traffic across identical copies
        of the same service. An <strong>API Gateway</strong> adds cross-cutting concerns like
        authentication, rate limiting, and request transformation before routing.
      </p>
    </div>
  </footer>
</main>

<style>
  :global(:root) {
    --color-bg: #000000;
    --color-surface: #030712;
    --color-border: #0d1b33;
    --color-text: #ffffff;
    --color-muted: #6b7a94;
    --color-accent: #1a6dff;
    --color-accent-rgb: 26, 109, 255;
    --color-accent-cyan: #00d4ff;
    --color-success: #00d4ff;
    --color-danger: #ef4444;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    min-height: 100vh;
  }

  :global(body::before) {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% 100%, rgba(26, 109, 255, 0.28) 0%, rgba(0, 212, 255, 0.10) 40%, transparent 70%),
      radial-gradient(ellipse 40% 30% at 80% 90%, rgba(0, 212, 255, 0.08) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }

  :global(#app) {
    position: relative;
    z-index: 1;
  }

  :global(*) {
    box-sizing: border-box;
  }

  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .app-nav {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .app-link {
    padding: 0.35rem 0.75rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-muted);
    text-decoration: none;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    transition: all 0.2s ease;
  }

  .app-link:hover {
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  .app-link.current {
    color: var(--color-accent-cyan);
    border-color: var(--color-accent-cyan);
    background: rgba(0, 212, 255, 0.08);
    pointer-events: none;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    margin: 0 0 0.25rem 0;
    background: linear-gradient(135deg, #00d4ff, #1a6dff);
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
    box-shadow: 0 0 16px color-mix(in srgb, var(--tab-color) 25%, transparent),
                inset 0 -2px 16px rgba(0, 212, 255, 0.10);
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
    background-image: linear-gradient(180deg, transparent 40%, rgba(26, 109, 255, 0.08) 100%);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    transition: box-shadow 0.3s ease;
    box-shadow: 0 0 50px rgba(26, 109, 255, 0.06);
  }

  .viz-panel:hover {
    box-shadow: 0 0 50px rgba(26, 109, 255, 0.06), 0 0 20px rgba(0, 212, 255, 0.10);
  }

  .viz-panel.flash-sent {
    box-shadow: 0 0 24px rgba(0, 212, 255, 0.4);
  }

  .controls-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .controls-card {
    background: var(--color-surface);
    background-image: linear-gradient(180deg, transparent 40%, rgba(26, 109, 255, 0.08) 100%);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    box-shadow: 0 0 50px rgba(26, 109, 255, 0.06);
  }

  .send-row {
    display: flex;
    gap: 0.5rem;
  }

  .send-btn {
    flex: 1;
    padding: 0.6rem;
    background: linear-gradient(135deg, #1456d0, #1a6dff);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .send-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 24px rgba(26, 109, 255, 0.6), 0 0 80px rgba(0, 212, 255, 0.15);
  }

  .send-btn:active {
    transform: translateY(0);
  }

  .path-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .path-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    font-weight: 600;
    flex-shrink: 0;
  }

  .path-buttons {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .path-btn {
    padding: 3px 10px;
    font-size: 0.7rem;
    font-family: monospace;
    font-weight: 600;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .path-btn:hover {
    border-color: var(--path-color);
    color: var(--path-color);
  }

  .path-btn.active {
    background: color-mix(in srgb, var(--path-color) 15%, transparent);
    border-color: var(--path-color);
    color: var(--path-color);
  }

  .auto-send {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .auto-btn {
    padding: 0.4rem 0.65rem;
    background: var(--color-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.75rem;
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
    padding: 0.6rem 0.75rem;
    background: transparent;
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    color: var(--color-text);
    border-color: var(--color-text);
  }

  .config-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.125rem 0;
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .config-title {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }

  .route-display {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    font-size: 0.75rem;
  }

  .rd-path {
    font-family: monospace;
    color: var(--color-text);
    font-weight: 600;
  }

  .rd-arrow {
    color: var(--color-muted);
  }

  .rd-service {
    font-weight: 600;
  }

  .algo-toggle {
    display: flex;
    gap: 4px;
  }

  .algo-btn {
    flex: 1;
    padding: 4px 8px;
    font-size: 0.7rem;
    font-weight: 600;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .algo-btn.active {
    background: #8b5cf620;
    border-color: #8b5cf6;
    color: #8b5cf6;
  }

  .middleware-toggle {
    display: flex !important;
    flex-direction: row !important;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    cursor: pointer;
  }

  .middleware-toggle input[type="checkbox"] {
    accent-color: var(--color-accent);
  }

  .middleware-toggle span {
    font-size: 0.78rem;
    font-weight: 600;
  }

  .controls-card label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 0.4rem;
  }

  .controls-card label:last-child {
    margin-bottom: 0;
  }

  .controls-card label span {
    font-size: 0.78rem;
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
    background: var(--color-accent);
    border-radius: 50%;
    cursor: pointer;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
    gap: 0.4rem;
  }

  .stat {
    background: var(--color-surface);
    background-image: linear-gradient(180deg, transparent 40%, rgba(26, 109, 255, 0.06) 100%);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.35rem 0.25rem;
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1rem;
    font-weight: 700;
  }

  .stat-label {
    font-size: 0.6rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat.routed .stat-value { color: var(--color-success); }
  .stat.failed .stat-value { color: var(--color-danger); }
  .stat.limited .stat-value { color: #f59e0b; }

  footer {
    margin-top: 2rem;
  }

  .how-it-works {
    background: var(--color-surface);
    background-image: linear-gradient(180deg, transparent 40%, rgba(26, 109, 255, 0.08) 100%);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 0 50px rgba(26, 109, 255, 0.06);
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

  .how-it-works strong {
    color: var(--color-text);
  }
</style>
