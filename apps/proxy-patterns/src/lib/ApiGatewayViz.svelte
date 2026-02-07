<script>
let { gateway } = $props();

function stepStatusClass(step) {
  if (!gateway.animating) return "";
  const animStep = gateway.animating.steps.find((s) => s.id === step.id);
  if (!animStep) return "";
  return animStep.status;
}
</script>

<div class="viz">
  <h3>API Gateway</h3>
  <p class="description">
    Applies <strong>cross-cutting concerns</strong> (auth, rate limiting, transforms)
    before routing &mdash; the key distinction from a plain reverse proxy.
  </p>

  <div class="flow-diagram">
    <!-- Client -->
    <div class="node client-node">
      <div class="node-icon">&#x1F4BB;</div>
      <div class="node-label">Client</div>
    </div>

    <!-- Arrow to gateway -->
    <div class="arrow-segment">
      <div class="arrow-line"></div>
      {#if gateway.animating}
        <div class="request-dot"></div>
      {/if}
    </div>

    <!-- API Gateway box with pipeline -->
    <div class="node gateway-node">
      <div class="node-label">API Gateway</div>
      <div class="pipeline">
        {#each gateway.pipeline as step (step.id)}
          <div
            class="pipeline-step"
            class:enabled={step.enabled}
            class:disabled={!step.enabled}
            class:passed={stepStatusClass(step) === 'passed'}
            class:failed={stepStatusClass(step) === 'failed'}
            class:pending={stepStatusClass(step) === 'pending'}
            style="--step-color: {step.color}"
          >
            <span class="step-name">{step.name}</span>
            {#if stepStatusClass(step) === 'passed'}
              <span class="step-icon pass-icon">&#x2713;</span>
            {:else if stepStatusClass(step) === 'failed'}
              <span class="step-icon fail-icon">&#x2717;</span>
            {/if}
          </div>
          {#if step.id !== gateway.pipeline[gateway.pipeline.length - 1].id}
            <div class="pipeline-arrow">&rarr;</div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Arrow to backends -->
    <div class="arrow-segment fan-out">
      <div class="arrow-line"></div>
    </div>

    <!-- Backend services -->
    <div class="backends">
      {#each gateway.services as service (service.path)}
        <div
          class="node service-node"
          class:targeted={gateway.animating?.status === 'routed' && gateway.animating?.target?.path === service.path}
          style="--svc-color: {service.color}"
        >
          <div class="service-header">
            <span class="service-name">{service.service}</span>
          </div>
          <div class="service-path">{service.path}</div>
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
    color: #10b981;
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
    min-width: 20px;
    max-width: 50px;
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
    background: #10b981;
    box-shadow: 0 0 12px #10b981;
    animation: travelRight 0.6s ease-in-out;
    left: 0;
  }

  @keyframes travelRight {
    from { left: 0; opacity: 0; }
    20% { opacity: 1; }
    to { left: calc(100% - 10px); opacity: 1; }
  }

  .gateway-node {
    background: var(--color-bg);
    border: 1px solid #10b98140;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    min-width: 200px;
  }

  .gateway-node .node-label {
    color: #10b981;
    margin-bottom: 8px;
    text-align: center;
  }

  .pipeline {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .pipeline-step {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--step-color);
    background: color-mix(in srgb, var(--step-color) 10%, transparent);
    color: var(--step-color);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pipeline-step.disabled {
    opacity: 0.3;
    border-style: dashed;
  }

  .pipeline-step.passed {
    background: color-mix(in srgb, var(--step-color) 25%, transparent);
    box-shadow: 0 0 8px color-mix(in srgb, var(--step-color) 30%, transparent);
  }

  .pipeline-step.failed {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
  }

  .step-icon {
    font-size: 0.7rem;
  }

  .pass-icon {
    color: #22c55e;
  }

  .fail-icon {
    color: #ef4444;
  }

  .pipeline-arrow {
    color: var(--color-muted);
    font-size: 0.65rem;
  }

  .fan-out {
    min-width: 15px;
    max-width: 35px;
  }

  .backends {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  .service-node {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 6px 10px;
    transition: all 0.3s ease;
    min-width: 110px;
  }

  .service-node.targeted {
    border-color: var(--svc-color);
    box-shadow: 0 0 12px color-mix(in srgb, var(--svc-color) 40%, transparent);
  }

  .service-header {
    margin-bottom: 2px;
  }

  .service-name {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--svc-color);
  }

  .service-path {
    font-size: 0.65rem;
    font-family: monospace;
    color: var(--color-muted);
  }
</style>
