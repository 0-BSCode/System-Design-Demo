<script>
import { AppNav } from "@rate-limiter/ui";
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
  <AppNav current="proxy-patterns" />

  <header>
    <h1>Proxy Patterns</h1>
    <p class="subtitle">Interactive visualization of reverse proxy, load balancer &amp; API gateway</p>
  </header>

  <nav class="tab-bar">
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
  .viz-panel.flash-sent {
    box-shadow: 0 0 24px rgba(0, 212, 255, 0.4);
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

  .stat.routed .stat-value { color: var(--color-success); }
  .stat.failed .stat-value { color: var(--color-danger); }
  .stat.limited .stat-value { color: #f59e0b; }
</style>
