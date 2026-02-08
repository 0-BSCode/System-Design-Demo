<script>
let { queue } = $props();

const priorityLabels = { critical: "Critical", normal: "Normal", low: "Low / Batch" };
const priorityIcons = { critical: "!!", normal: "\u2022", low: "\u2026" };
</script>

<div class="viz priority-queue-viz">
  <h3>Priority Queue</h3>
  <p class="description">
    Three priority lanes: Critical, Normal, Low. Workers always pick from the
    highest-priority non-empty lane. Items waiting &gt;10s get promoted to prevent starvation.
  </p>

  <div class="queue-layout">
    <!-- Priority Lanes -->
    <div class="lanes-col">
      <div class="lane-header-main">
        <span class="lane-title">Priority Lanes</span>
        <span class="lane-count">{queue.totalQueued} queued</span>
      </div>
      {#each ["critical", "normal", "low"] as priority}
        {@const items = queue.lanes[priority]}
        <div class="priority-lane" style="--priority-color: {queue.priorityColors[priority]}">
          <div class="priority-header">
            <span class="priority-icon">{priorityIcons[priority]}</span>
            <span class="priority-label">{priorityLabels[priority]}</span>
            <span class="priority-count">{items.length}</span>
          </div>
          <div class="priority-items">
            {#each items.slice(0, 6) as job (job.id)}
              <div class="queue-item" style="--item-color: {job.color}">
                <span class="item-label">{job.label}</span>
              </div>
            {/each}
            {#if items.length > 6}
              <span class="overflow">+{items.length - 6}</span>
            {/if}
            {#if items.length === 0}
              <span class="lane-empty">Empty</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <!-- Workers -->
    <div class="workers-col">
      <div class="lane-header-main">
        <span class="lane-title">Workers</span>
        <span class="lane-count">{queue.workers.filter(w => w.busy).length}/{queue.workers.length}</span>
      </div>
      <div class="worker-slots">
        {#each queue.workers as worker (worker.id)}
          <div class="worker-slot" class:busy={worker.busy}>
            <div class="worker-label">W{worker.id + 1}</div>
            {#if worker.busy}
              {@const pJob = queue.processing.find(j => j.id === worker.jobId)}
              <div class="worker-job">
                <div class="worker-job-header">
                  <span class="worker-job-label">{worker.jobLabel}</span>
                  <span class="worker-priority" style="color: {queue.priorityColors[worker.priority]}">{worker.priority}</span>
                </div>
                {#if pJob}
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: {pJob.progress}%; background: {worker.jobColor}"></div>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="worker-idle">Idle</div>
            {/if}
          </div>
        {/each}
      </div>

      {#if queue.promotions > 0}
        <div class="promotions-badge">
          {"\u2191"} {queue.promotions} promotion{queue.promotions !== 1 ? "s" : ""}
        </div>
      {/if}
    </div>

    <!-- Completed -->
    <div class="completed-col">
      <div class="lane-header-main">
        <span class="lane-title">Done</span>
        <span class="lane-count">{queue.completed.length}</span>
      </div>
      <div class="completed-items">
        {#each queue.completed.slice(0, 10) as job (job.id)}
          <div class="completed-item" style="--item-color: {queue.priorityColors[job.priority]}">
            <span class="done-icon">{"\u2713"}</span>
            <span class="item-label">{job.label}</span>
            <span class="item-priority" style="color: {queue.priorityColors[job.priority]}">{job.priority[0].toUpperCase()}</span>
          </div>
        {/each}
        {#if queue.completed.length === 0}
          <div class="empty-lane">None yet</div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .priority-queue-viz {
    text-align: left;
  }

  .queue-layout {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .lane-header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0.5rem;
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

  /* Priority lanes */

  .priority-lane {
    border: 1px solid color-mix(in srgb, var(--priority-color) 30%, transparent);
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 6px;
    background: color-mix(in srgb, var(--priority-color) 4%, transparent);
  }

  .priority-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .priority-icon {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--priority-color);
  }

  .priority-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--priority-color);
    flex: 1;
  }

  .priority-count {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 1px 5px;
    border-radius: 3px;
  }

  .priority-items {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 5px;
    font-size: 0.7rem;
    background: color-mix(in srgb, var(--item-color) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--item-color) 20%, transparent);
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-6px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .item-label {
    flex: 1;
    color: var(--color-text);
    font-weight: 500;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .overflow {
    font-size: 0.65rem;
    color: var(--color-muted);
    padding: 2px 4px;
    text-align: center;
  }

  .lane-empty {
    font-size: 0.7rem;
    color: var(--color-muted);
    opacity: 0.5;
    text-align: center;
    padding: 4px 0;
  }

  /* Workers */

  .worker-slots {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .worker-slot {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    transition: all 0.2s ease;
  }

  .worker-slot.busy {
    border-color: rgba(0, 212, 255, 0.3);
    background: rgba(0, 212, 255, 0.04);
  }

  .worker-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-muted);
    min-width: 22px;
  }

  .worker-job {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .worker-job-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .worker-job-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .worker-priority {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .progress-bar {
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.15s linear;
  }

  .worker-idle {
    flex: 1;
    font-size: 0.72rem;
    color: var(--color-muted);
    opacity: 0.5;
  }

  .promotions-badge {
    margin-top: 8px;
    padding: 4px 8px;
    background: rgba(168, 85, 247, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    color: #a855f7;
    text-align: center;
  }

  /* Completed */

  .completed-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 280px;
    overflow-y: auto;
  }

  .completed-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    background: color-mix(in srgb, var(--item-color) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--item-color) 12%, transparent);
    opacity: 0.7;
  }

  .done-icon {
    color: #22c55e;
    font-weight: 700;
  }

  .item-priority {
    font-size: 0.6rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .empty-lane {
    text-align: center;
    font-size: 0.75rem;
    color: var(--color-muted);
    padding: 1.5rem 0;
    opacity: 0.6;
  }

  .completed-items::-webkit-scrollbar { width: 3px; }
  .completed-items::-webkit-scrollbar-track { background: transparent; }
  .completed-items::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
</style>
