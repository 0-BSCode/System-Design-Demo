<script>
let { onApply, currentAlgorithm } = $props();

const presets = [
  {
    id: "login",
    name: "/auth/login",
    tag: "Endpoint",
    description: "Strict login protection",
    requests: 3,
    windowSeconds: 10,
  },
  {
    id: "api-data",
    name: "/api/data",
    tag: "Endpoint",
    description: "Standard API endpoint",
    requests: 10,
    windowSeconds: 5,
  },
  {
    id: "search",
    name: "/api/search",
    tag: "Endpoint",
    description: "Search rate limit",
    requests: 5,
    windowSeconds: 5,
  },
  {
    id: "premium",
    name: "Premium Tier",
    tag: "User Tier",
    description: "Generous paid-user limits",
    requests: 15,
    windowSeconds: 5,
  },
  {
    id: "free",
    name: "Free Tier",
    tag: "User Tier",
    description: "Restrictive free-user limits",
    requests: 3,
    windowSeconds: 5,
  },
];

let selectedId = $state(null);
let customRequests = $state(5);
let customWindowSeconds = $state(5);
let showCustom = $state(false);

function selectPreset(preset) {
  selectedId = preset.id;
  showCustom = false;
  onApply({ requests: preset.requests, windowSeconds: preset.windowSeconds });
}

function openCustom() {
  selectedId = "custom";
  showCustom = true;
}

function applyCustom() {
  onApply({ requests: customRequests, windowSeconds: customWindowSeconds });
}

let effectiveRate = $derived.by(() => {
  if (selectedId === "custom") {
    return { requests: customRequests, windowSeconds: customWindowSeconds };
  }
  const preset = presets.find((p) => p.id === selectedId);
  return preset ? { requests: preset.requests, windowSeconds: preset.windowSeconds } : null;
});
</script>

<div class="rule-section">
  <h4>Rate Limit Rule</h4>
  <p class="rule-hint">Select a rule to apply to the <strong>{currentAlgorithm}</strong> algorithm</p>

  <div class="presets">
    {#each presets as preset (preset.id)}
      <button
        class="preset-chip"
        class:active={selectedId === preset.id}
        onclick={() => selectPreset(preset)}
      >
        <span class="preset-tag">{preset.tag}</span>
        <span class="preset-name">{preset.name}</span>
        <span class="preset-limit">{preset.requests} req / {preset.windowSeconds}s</span>
      </button>
    {/each}
    <button
      class="preset-chip custom-chip"
      class:active={selectedId === 'custom'}
      onclick={openCustom}
    >
      <span class="preset-tag">Custom</span>
      <span class="preset-name">Custom Rule</span>
      <span class="preset-limit">Define your own</span>
    </button>
  </div>

  {#if showCustom}
    <div class="custom-form">
      <label>
        <span>Max Requests: {customRequests}</span>
        <input type="range" min="1" max="30" bind:value={customRequests} oninput={applyCustom} />
      </label>
      <label>
        <span>Window: {customWindowSeconds}s</span>
        <input type="range" min="1" max="30" bind:value={customWindowSeconds} oninput={applyCustom} />
      </label>
    </div>
  {/if}

  {#if effectiveRate}
    <div class="effective-rule">
      Enforcing: <strong>{effectiveRate.requests} requests</strong> per <strong>{effectiveRate.windowSeconds}s</strong> window
    </div>
  {/if}
</div>

<style>
  .rule-section {
    background: var(--color-surface);
    background-image: var(--surface-inner-gradient);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1rem;
    box-shadow: var(--surface-glow);
    transition: background 0.4s ease, border-color 0.4s ease;
  }

  h4 {
    margin: 0 0 0.25rem 0;
    font-size: 0.85rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rule-hint {
    margin: 0 0 0.75rem 0;
    font-size: 0.75rem;
    color: var(--color-muted);
    line-height: 1.4;
  }

  .rule-hint strong {
    color: var(--color-text);
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .preset-chip {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 0.5rem 0.65rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 0;
    flex: 1 1 calc(50% - 0.25rem);
  }

  .preset-chip:hover {
    border-color: var(--color-accent);
  }

  .preset-chip.active {
    background: rgba(var(--color-accent-rgb), 0.12);
    border-color: var(--color-accent);
    box-shadow: 0 0 8px rgba(var(--color-accent-rgb), 0.2);
  }

  .preset-tag {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    font-weight: 600;
  }

  .preset-chip.active .preset-tag {
    color: var(--color-accent-secondary);
  }

  .preset-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .preset-limit {
    font-size: 0.7rem;
    color: var(--color-muted);
    font-family: monospace;
  }

  .preset-chip.active .preset-limit {
    color: var(--color-accent-secondary);
  }

  .custom-chip {
    border-style: dashed;
  }

  .custom-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--color-bg);
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }

  .custom-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .custom-form label span {
    font-size: 0.8rem;
    color: var(--color-text);
    font-weight: 500;
  }

  .effective-rule {
    font-size: 0.78rem;
    color: var(--color-muted);
    padding: 0.5rem 0.65rem;
    background: rgba(var(--color-accent-rgb), 0.08);
    border-radius: 6px;
    border: 1px solid rgba(var(--color-accent-rgb), 0.15);
  }

  .effective-rule strong {
    color: var(--color-accent-secondary);
  }
</style>
