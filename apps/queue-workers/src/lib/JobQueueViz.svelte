<script>
let { queue } = $props();
</script>

<div class="viz job-queue-viz">
  <h3>Job Queue (FIFO)</h3>
  <p class="description">
    Jobs are processed in order. Workers independently pull the next job.
    Failed jobs retry up to 3 times before going to the dead-letter queue.
  </p>

  <div class="queue-layout">
    <!-- Queued items -->
    <div class="lane">
      <div class="lane-header">
        <span class="lane-title">Queued</span>
        <span class="lane-count">{queue.queue.length}</span>
      </div>
      <div class="lane-items">
        {#each queue.queue.slice(0, 12) as job (job.id)}
          <div class="queue-item" style="--item-color: {job.color}">
            <span class="item-label">{job.label}</span>
            {#if job.retries > 0}
              <span class="retry-badge">R{job.retries}</span>
            {/if}
          </div>
        {/each}
        {#if queue.queue.length > 12}
          <div class="overflow">+{queue.queue.length - 12} more</div>
        {/if}
        {#if queue.queue.length === 0}
          <div class="empty-lane">Empty</div>
        {/if}
      </div>
    </div>

    <!-- Workers -->
    <div class="lane workers-lane">
      <div class="lane-header">
        <span class="lane-title">Workers</span>
        <span class="lane-count">{queue.workers.filter(w => w.busy).length}/{queue.workers.length}</span>
      </div>
      <div class="worker-slots">
        {#each queue.workers as worker (worker.id)}
          <div class="worker-slot" class:busy={worker.busy}>
            <div class="worker-label">W{worker.id + 1}</div>
            {#if worker.busy}
              {@const pJob = queue.processing.find(j => j.id === worker.jobId)}
              <div class="worker-job" style="--item-color: {worker.jobColor}">
                <span class="worker-job-label">{worker.jobLabel}</span>
                {#if pJob}
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: {pJob.progress}%; background: {worker.jobColor}"></div>
                  </div>
                  <span class="progress-pct">{Math.round(pJob.progress)}%</span>
                {/if}
              </div>
            {:else}
              <div class="worker-idle">Idle</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Completed -->
    <div class="lane">
      <div class="lane-header">
        <span class="lane-title">Done</span>
        <span class="lane-count">{queue.completed.length}</span>
      </div>
      <div class="lane-items completed-items">
        {#each queue.completed.slice(0, 8) as job (job.id)}
          <div class="queue-item completed" style="--item-color: {job.color}">
            <span class="done-icon">{"\u2713"}</span>
            <span class="item-label">{job.label}</span>
          </div>
        {/each}
        {#if queue.completed.length === 0}
          <div class="empty-lane">None yet</div>
        {/if}
      </div>
    </div>
  </div>

  {#if queue.dlq.length > 0}
    <div class="dlq-section">
      <span class="dlq-label">{"\u2620"} Dead Letter Queue: {queue.dlq.length}</span>
    </div>
  {/if}
</div>

<style>
  .job-queue-viz {
    text-align: left;
  }

  .queue-layout {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
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

  .lane-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 250px;
    overflow-y: auto;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    background: color-mix(in srgb, var(--item-color) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--item-color) 25%, transparent);
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .queue-item.completed {
    opacity: 0.7;
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

  .retry-badge {
    font-size: 0.6rem;
    font-weight: 700;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.15);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .done-icon {
    color: #22c55e;
    font-weight: 700;
  }

  .overflow {
    text-align: center;
    font-size: 0.7rem;
    color: var(--color-muted);
    padding: 4px;
  }

  .empty-lane {
    text-align: center;
    font-size: 0.75rem;
    color: var(--color-muted);
    padding: 1.5rem 0;
    opacity: 0.6;
  }

  /* Workers column */

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

  .worker-job-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .progress-pct {
    font-size: 0.6rem;
    color: var(--color-muted);
  }

  .worker-idle {
    flex: 1;
    font-size: 0.72rem;
    color: var(--color-muted);
    opacity: 0.5;
  }

  /* DLQ */

  .dlq-section {
    margin-top: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
  }

  .dlq-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #ef4444;
  }

  .lane-items::-webkit-scrollbar { width: 3px; }
  .lane-items::-webkit-scrollbar-track { background: transparent; }
  .lane-items::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
</style>
