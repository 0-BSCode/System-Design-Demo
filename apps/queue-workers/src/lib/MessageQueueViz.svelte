<script>
let { queue } = $props();

const topicColors = {
  orders: "#3b82f6",
  notifications: "#8b5cf6",
  analytics: "#f59e0b",
};
</script>

<div class="viz message-queue-viz">
  <h3>Message Queue (Pub/Sub)</h3>
  <p class="description">
    Producers publish messages to topics. Consumers subscribe and process
    messages with acknowledgment. Backlog per topic shows pending work.
  </p>

  <div class="queue-layout">
    <!-- Topics with pending messages -->
    <div class="lane">
      <div class="lane-header">
        <span class="lane-title">Topics</span>
        <span class="lane-count">{queue.pendingCount} pending</span>
      </div>
      <div class="topics">
        {#each queue.topics as topic}
          {@const msgs = queue.pending[topic] || []}
          <div class="topic-row" style="--topic-color: {topicColors[topic]}">
            <div class="topic-header">
              <span class="topic-name">{topic}</span>
              <span class="topic-count">{msgs.length}</span>
            </div>
            <div class="topic-items">
              {#each msgs.slice(0, 5) as msg (msg.id)}
                <div class="msg-chip" style="--item-color: {msg.color}">
                  {msg.label}
                </div>
              {/each}
              {#if msgs.length > 5}
                <span class="overflow">+{msgs.length - 5}</span>
              {/if}
              {#if msgs.length === 0}
                <span class="topic-empty">No pending</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Consumers -->
    <div class="lane consumers-lane">
      <div class="lane-header">
        <span class="lane-title">Consumers</span>
        <span class="lane-count">{queue.consumers.filter(c => c.busy).length}/{queue.consumers.length}</span>
      </div>
      <div class="consumer-slots">
        {#each queue.consumers as consumer (consumer.id)}
          <div class="consumer-slot" class:busy={consumer.busy}>
            <div class="consumer-label">C{consumer.id + 1}</div>
            {#if consumer.busy}
              <div class="consumer-job" style="--item-color: {consumer.messageColor}">
                <span class="consumer-job-label">{consumer.messageLabel}</span>
                <span class="consumer-topic" style="color: {topicColors[consumer.topic]}">{consumer.topic}</span>
              </div>
            {:else}
              <div class="consumer-idle">Waiting</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Delivered -->
    <div class="lane">
      <div class="lane-header">
        <span class="lane-title">Delivered</span>
        <span class="lane-count">{queue.delivered.length}</span>
      </div>
      <div class="lane-items">
        {#each queue.delivered.slice(0, 10) as msg (msg.id)}
          <div class="delivered-item" style="--item-color: {msg.color}">
            <span class="done-icon">{"\u2713"}</span>
            <span class="item-label">{msg.label}</span>
          </div>
        {/each}
        {#if queue.delivered.length === 0}
          <div class="empty-lane">None yet</div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .message-queue-viz {
    text-align: left;
  }

  .queue-layout {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .lane {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .lane-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid var(--color-border);
  }

  .lane-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  .lane-count {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-accent-cyan);
    background: rgba(0, 212, 255, 0.1);
    padding: 1px 6px;
    border-radius: 4px;
  }

  /* Topics */

  .topics {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .topic-row {
    border: 1px solid color-mix(in srgb, var(--topic-color) 30%, transparent);
    border-radius: 8px;
    padding: 8px;
    background: color-mix(in srgb, var(--topic-color) 5%, transparent);
  }

  .topic-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .topic-name {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--topic-color);
    text-transform: capitalize;
  }

  .topic-count {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 1px 5px;
    border-radius: 3px;
  }

  .topic-items {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .msg-chip {
    font-size: 0.65rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--item-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--item-color) 25%, transparent);
    color: var(--color-text);
    animation: chipIn 0.2s ease;
  }

  @keyframes chipIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }

  .overflow {
    font-size: 0.65rem;
    color: var(--color-muted);
    padding: 2px 4px;
  }

  .topic-empty {
    font-size: 0.65rem;
    color: var(--color-muted);
    opacity: 0.5;
  }

  /* Consumers */

  .consumer-slots {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .consumer-slot {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    transition: all 0.2s ease;
  }

  .consumer-slot.busy {
    border-color: rgba(0, 212, 255, 0.3);
    background: rgba(0, 212, 255, 0.04);
  }

  .consumer-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted);
    min-width: 22px;
  }

  .consumer-job {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .consumer-job-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .consumer-topic {
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .consumer-idle {
    flex: 1;
    font-size: 0.72rem;
    color: var(--color-muted);
    opacity: 0.5;
  }

  /* Delivered */

  .lane-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 250px;
    overflow-y: auto;
  }

  .delivered-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    background: color-mix(in srgb, var(--item-color) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--item-color) 15%, transparent);
    opacity: 0.7;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(8px); }
    to { opacity: 0.7; transform: translateX(0); }
  }

  .done-icon {
    color: #22c55e;
    font-weight: 700;
  }

  .item-label {
    flex: 1;
    color: var(--color-text);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-lane {
    text-align: center;
    font-size: 0.75rem;
    color: var(--color-muted);
    padding: 1.5rem 0;
    opacity: 0.6;
  }

  .lane-items::-webkit-scrollbar { width: 3px; }
  .lane-items::-webkit-scrollbar-track { background: transparent; }
  .lane-items::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
</style>
