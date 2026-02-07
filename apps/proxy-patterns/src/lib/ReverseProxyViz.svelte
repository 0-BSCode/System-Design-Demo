<script>
let { proxy } = $props();
</script>

<div class="viz">
  <h3>Reverse Proxy</h3>
  <p class="description">
    Routes requests to <strong>different services</strong> based on URL path.
    Each backend is a distinct service with its own purpose.
  </p>

  <div class="flow-diagram">
    <!-- Client -->
    <div class="node client-node">
      <div class="node-icon">&#x1F4BB;</div>
      <div class="node-label">Client</div>
    </div>

    <!-- Arrow to proxy -->
    <div class="arrow-segment">
      <div class="arrow-line"></div>
      {#if proxy.animating?.status === 'routing'}
        <div class="request-dot" style="--dot-color: {proxy.animating.target?.color ?? '#ef4444'}"></div>
      {/if}
    </div>

    <!-- Reverse Proxy box with routing table -->
    <div class="node proxy-node">
      <div class="node-label">Reverse Proxy</div>
      <div class="routing-table">
        {#each proxy.routes as route (route.path)}
          <div class="route-row" class:active={proxy.animating?.path === route.path}>
            <span class="route-path">{route.path}</span>
            <span class="route-arrow">&rarr;</span>
            <span class="route-service" style="color: {route.color}">{route.service}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Arrow to backends -->
    <div class="arrow-segment fan-out">
      <div class="arrow-line"></div>
    </div>

    <!-- Backend services -->
    <div class="backends">
      {#each proxy.routes as route (route.path)}
        <div
          class="node backend-node"
          class:targeted={proxy.animating?.target?.path === route.path}
          style="--backend-color: {route.color}"
        >
          <div class="backend-header" style="background: {route.color}20; border-color: {route.color}40">
            <span class="backend-name">{route.service}</span>
            <span class="backend-port">:{route.port}</span>
          </div>
          <div class="backend-path">{route.path}</div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .viz {
    min-height: 280px;
  }

  h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
    color: #3b82f6;
  }

  .description {
    color: var(--color-muted);
    font-size: 0.8rem;
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }

  .description strong {
    color: var(--color-text);
  }

  .flow-diagram {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0.5rem 0;
  }

  .node {
    flex-shrink: 0;
  }

  .client-node {
    text-align: center;
    min-width: 60px;
  }

  .node-icon {
    font-size: 1.5rem;
    margin-bottom: 4px;
  }

  .node-label {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .arrow-segment {
    flex: 1;
    min-width: 30px;
    max-width: 60px;
    height: 2px;
    position: relative;
    display: flex;
    align-items: center;
  }

  .arrow-line {
    width: 100%;
    height: 2px;
    background: var(--color-border);
    position: relative;
  }

  .arrow-line::after {
    content: '';
    position: absolute;
    right: -1px;
    top: -4px;
    border: 5px solid transparent;
    border-left-color: var(--color-border);
  }

  .request-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--dot-color);
    box-shadow: 0 0 12px var(--dot-color);
    animation: travelRight 0.6s ease-in-out;
    left: 0;
  }

  @keyframes travelRight {
    from { left: 0; opacity: 0; }
    20% { opacity: 1; }
    to { left: calc(100% - 10px); opacity: 1; }
  }

  .proxy-node {
    background: var(--color-bg);
    border: 1px solid #3b82f640;
    border-radius: 8px;
    padding: 0.5rem;
    min-width: 160px;
  }

  .proxy-node .node-label {
    color: #3b82f6;
    margin-bottom: 6px;
    text-align: center;
  }

  .routing-table {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .route-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    transition: background 0.2s ease;
  }

  .route-row.active {
    background: rgba(59, 130, 246, 0.15);
  }

  .route-path {
    font-family: monospace;
    color: var(--color-text);
    font-weight: 600;
  }

  .route-arrow {
    color: var(--color-muted);
  }

  .route-service {
    font-weight: 600;
  }

  .fan-out {
    min-width: 20px;
    max-width: 40px;
  }

  .backends {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  .backend-node {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 4px 8px;
    transition: all 0.3s ease;
    min-width: 120px;
  }

  .backend-node.targeted {
    border-color: var(--backend-color);
    box-shadow: 0 0 12px color-mix(in srgb, var(--backend-color) 40%, transparent);
  }

  .backend-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid transparent;
    margin-bottom: 2px;
  }

  .backend-name {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .backend-port {
    font-size: 0.65rem;
    color: var(--color-muted);
    font-family: monospace;
  }

  .backend-path {
    font-size: 0.65rem;
    font-family: monospace;
    color: var(--color-muted);
  }
</style>
