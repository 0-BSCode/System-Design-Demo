<script>
import { getTheme, toggleTheme } from "./theme.svelte.js";

let theme = $derived(getTheme());
</script>

<button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
  <span class="toggle-track">
    <span class="toggle-thumb" class:flux={theme === 'flux'}></span>
  </span>
  <span class="toggle-label">{theme === 'default' ? 'Midnight' : 'Flux'}</span>
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--color-muted);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .theme-toggle:hover {
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  .toggle-track {
    width: 32px;
    height: 18px;
    background: var(--color-border);
    border-radius: 9px;
    position: relative;
    transition: background 0.3s ease;
  }

  .theme-toggle:hover .toggle-track {
    background: var(--color-accent);
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: var(--color-text);
    border-radius: 50%;
    transition: all 0.3s ease;
  }

  .toggle-thumb.flux {
    left: 16px;
    background: #00d4ff;
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
  }

  .toggle-label {
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
