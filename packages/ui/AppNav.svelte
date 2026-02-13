<script>
let { current } = $props();

const apps = [
  { id: "rate-limiter", label: "Rate Limiter", href: "/rate-limiter/" },
  { id: "cache-invalidation", label: "Cache Invalidation", href: "/cache-invalidation/" },
  { id: "proxy-patterns", label: "Proxy Patterns", href: "/proxy-patterns/" },
  { id: "queue-workers", label: "Queue Workers", href: "/queue-workers/" },
  { id: "offline-first", label: "Offline First", href: "/offline-first/" },
];
</script>

{#if import.meta.env.DEV}
<nav class="app-nav">
  {#each apps as app (app.id)}
    <a
      class="app-link"
      class:current={current === app.id}
      href={app.href}
    >
      {app.label}
    </a>
  {/each}
</nav>
{/if}

<style>
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
</style>
