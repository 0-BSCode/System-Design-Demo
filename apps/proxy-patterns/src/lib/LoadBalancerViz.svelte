<script>
let { balancer } = $props();
</script>

<div class="viz">
  <h3>Load Balancer</h3>
  <p class="description">
    Distributes requests across <strong>identical copies</strong> of the same service.
    All backends serve the same purpose &mdash; unlike a reverse proxy.
  </p>

  <div class="flow-diagram">
    <!-- Client -->
    <div class="node client-node">
      <div class="node-icon">&#x1F4BB;</div>
      <div class="node-label">Client</div>
    </div>

    <!-- Arrow to LB -->
    <div class="arrow-segment">
      <div class="arrow-line"></div>
      {#if balancer.animating}
        <div class="request-dot"></div>
      {/if}
    </div>

    <!-- Load Balancer box -->
    <div class="node lb-node">
      <div class="node-label">Load Balancer</div>
      <div class="algo-badge">{balancer.algorithm === 'round-robin' ? 'Round Robin' : 'Least Conn'}</div>
      {#if balancer.algorithm === 'round-robin'}
        <div class="counter">Next: #{(balancer.currentIndex % balancer.instances.length) + 1}</div>
      {/if}
    </div>

    <!-- Arrow to backends -->
    <div class="arrow-segment fan-out">
      <div class="arrow-line"></div>
    </div>

    <!-- Backend instances (all identical) -->
    <div class="backends">
      {#each balancer.instances as instance, idx (instance.id)}
        <div
          class="node instance-node"
          class:targeted={balancer.animating?.targetIndex === idx}
        >
          <div class="instance-header">
            <span class="instance-name">{instance.name}</span>
            <span class="instance-port">:{instance.port}</span>
          </div>
          <div class="instance-stats">
            <span class="badge requests" title="Total requests">
              {instance.requestCount}
            </span>
            {#if instance.connections > 0}
              <span class="badge connections" title="Active connections">
                {instance.connections} active
              </span>
            {/if}
          </div>
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
    color: #8b5cf6;
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
    background: #8b5cf6;
    box-shadow: 0 0 12px #8b5cf6;
    animation: travelRight 0.6s ease-in-out;
    left: 0;
  }

  @keyframes travelRight {
    from { left: 0; opacity: 0; }
    20% { opacity: 1; }
    to { left: calc(100% - 10px); opacity: 1; }
  }

  .lb-node {
    background: var(--color-bg);
    border: 1px solid #8b5cf640;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    text-align: center;
    min-width: 120px;
  }

  .lb-node .node-label {
    color: #8b5cf6;
    margin-bottom: 6px;
  }

  .algo-badge {
    font-size: 0.65rem;
    background: #8b5cf620;
    color: #8b5cf6;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
    display: inline-block;
    margin-bottom: 4px;
  }

  .counter {
    font-size: 0.65rem;
    color: var(--color-muted);
    font-family: monospace;
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

  .instance-node {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 6px 10px;
    transition: all 0.3s ease;
    min-width: 130px;
    /* All instances same color to visually convey "identical" */
    background: var(--color-bg);
  }

  .instance-node.targeted {
    border-color: #8b5cf6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
  }

  .instance-header {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  }

  .instance-name {
    font-size: 0.7rem;
    font-weight: 700;
    color: #8b5cf6;
  }

  .instance-port {
    font-size: 0.65rem;
    color: var(--color-muted);
    font-family: monospace;
  }

  .instance-stats {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .badge {
    font-size: 0.6rem;
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 600;
  }

  .badge.requests {
    background: #8b5cf620;
    color: #8b5cf6;
  }

  .badge.connections {
    background: #f59e0b20;
    color: #f59e0b;
  }
</style>
