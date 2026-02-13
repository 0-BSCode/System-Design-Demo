<script>
import { AppFooter, AppNav } from "@system-design-monorepo/ui";
import { onDestroy } from "svelte";
import EventLog from "./lib/EventLog.svelte";
import JobQueueViz from "./lib/JobQueueViz.svelte";
import MessageQueueViz from "./lib/MessageQueueViz.svelte";
import PriorityQueueViz from "./lib/PriorityQueueViz.svelte";
import { createJobQueue, createMessageQueue, createPriorityQueue } from "./lib/queues.svelte.js";

const tabs = [
  { id: "job-queue", label: "Job Queue", color: "#3b82f6" },
  { id: "message-queue", label: "Message Queue", color: "#8b5cf6" },
  { id: "priority-queue", label: "Priority Queue", color: "#f59e0b" },
];

let selected = $state("job-queue");
let autoSend = $state(false);
let autoIntervalId = null;
let autoRate = $state(2);

let jobQueue = createJobQueue(2);
let messageQueue = createMessageQueue(2);
let priorityQueue = createPriorityQueue(2);

let queue = $derived.by(() => {
  switch (selected) {
    case "job-queue":
      return jobQueue;
    case "message-queue":
      return messageQueue;
    case "priority-queue":
      return priorityQueue;
    default:
      return jobQueue;
  }
});

let stats = $derived.by(() => {
  switch (selected) {
    case "job-queue":
      return {
        items: [
          { label: "Queued", value: jobQueue.queue.length, color: null },
          { label: "Processing", value: jobQueue.processing.length, color: "#00d4ff" },
          { label: "Completed", value: jobQueue.completed.length, color: "#22c55e" },
          { label: "Failed", value: jobQueue.failed.length, color: "#ef4444" },
          { label: "DLQ", value: jobQueue.dlq.length, color: "#f59e0b" },
        ],
      };
    case "message-queue":
      return {
        items: [
          { label: "Published", value: messageQueue.publishedCount, color: null },
          { label: "Pending", value: messageQueue.pendingCount, color: "#f59e0b" },
          { label: "Delivered", value: messageQueue.delivered.length, color: "#22c55e" },
          { label: "Ack'd", value: messageQueue.acknowledgedCount, color: "#00d4ff" },
        ],
      };
    case "priority-queue":
      return {
        items: [
          { label: "Critical", value: priorityQueue.lanes.critical.length, color: "#ef4444" },
          { label: "Normal", value: priorityQueue.lanes.normal.length, color: "#3b82f6" },
          { label: "Low", value: priorityQueue.lanes.low.length, color: "#6b7280" },
          { label: "Done", value: priorityQueue.completed.length, color: "#22c55e" },
          { label: "Promoted", value: priorityQueue.promotions, color: "#a855f7" },
        ],
      };
    default:
      return { items: [] };
  }
});

function addItem() {
  switch (selected) {
    case "job-queue":
      jobQueue.enqueue();
      break;
    case "message-queue":
      messageQueue.publish();
      break;
    case "priority-queue":
      priorityQueue.enqueueRandom();
      break;
  }
}

function toggleAutoSend() {
  autoSend = !autoSend;
  if (autoSend) {
    autoIntervalId = setInterval(addItem, 1000 / autoRate);
  } else {
    if (autoIntervalId) clearInterval(autoIntervalId);
    autoIntervalId = null;
  }
}

function updateAutoRate(newRate) {
  autoRate = newRate;
  if (autoSend) {
    if (autoIntervalId) clearInterval(autoIntervalId);
    autoIntervalId = setInterval(addItem, 1000 / autoRate);
  }
}

function resetAll() {
  autoSend = false;
  if (autoIntervalId) clearInterval(autoIntervalId);
  autoIntervalId = null;
  queue.reset();
}

function switchTab(id) {
  autoSend = false;
  if (autoIntervalId) clearInterval(autoIntervalId);
  autoIntervalId = null;
  selected = id;
}

function getWorkerCount() {
  if (selected === "message-queue") return messageQueue.consumerCount;
  if (selected === "priority-queue") return priorityQueue.workerCount;
  return jobQueue.workerCount;
}

function setWorkerCount(count) {
  switch (selected) {
    case "job-queue":
      jobQueue.setWorkerCount(count);
      break;
    case "message-queue":
      messageQueue.setConsumerCount(count);
      break;
    case "priority-queue":
      priorityQueue.setWorkerCount(count);
      break;
  }
}

onDestroy(() => {
  jobQueue.destroy();
  messageQueue.destroy();
  priorityQueue.destroy();
  if (autoIntervalId) clearInterval(autoIntervalId);
});
</script>

<main>
  <AppNav current="queue-workers" />

  <header>
    <h1>Queues & Workers</h1>
    <p class="subtitle">Interactive visualization of distributed queue patterns</p>
  </header>

  <nav class="tab-bar">
    {#each tabs as tab (tab.id)}
      <button
        class="tab"
        class:active={selected === tab.id}
        style="--tab-color: {tab.color}"
        onclick={() => switchTab(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </nav>

  <div class="content">
    <div class="viz-panel">
      {#if selected === 'job-queue'}
        <JobQueueViz queue={jobQueue} />
      {:else if selected === 'message-queue'}
        <MessageQueueViz queue={messageQueue} />
      {:else if selected === 'priority-queue'}
        <PriorityQueueViz queue={priorityQueue} />
      {/if}
    </div>

    <div class="controls-panel">
      <div class="controls-card">
        <div class="send-row">
          <button class="send-btn" onclick={addItem}>
            {#if selected === 'message-queue'}
              Publish Message
            {:else}
              Add Job
            {/if}
          </button>
          <button class="reset-btn" onclick={resetAll}>Reset</button>
        </div>

        <div class="auto-send">
          <button
            class="auto-btn"
            class:active={autoSend}
            onclick={toggleAutoSend}
          >
            {autoSend ? 'Stop' : 'Auto'}
          </button>
          <label class="rate-control">
            <span>{autoRate}/s</span>
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

        <label>
          <span>{selected === 'message-queue' ? 'Consumers' : 'Workers'}: {getWorkerCount()}</span>
          <input
            type="range"
            min="1"
            max="5"
            value={getWorkerCount()}
            oninput={(e) => setWorkerCount(Number(e.target.value))}
          />
        </label>

        {#if selected === 'job-queue'}
          <label>
            <span>Failure Rate: {jobQueue.failureRate}%</span>
            <input
              type="range"
              min="0"
              max="30"
              value={jobQueue.failureRate}
              oninput={(e) => jobQueue.setFailureRate(Number(e.target.value))}
            />
          </label>
        {:else if selected === 'priority-queue'}
          <label>
            <span>Failure Rate: {priorityQueue.failureRate}%</span>
            <input
              type="range"
              min="0"
              max="30"
              value={priorityQueue.failureRate}
              oninput={(e) => priorityQueue.setFailureRate(Number(e.target.value))}
            />
          </label>
        {/if}
      </div>

      <div class="stats-row">
        {#each stats.items as stat}
          <div class="stat">
            <span class="stat-value" style={stat.color ? `color: ${stat.color}` : ''}>{stat.value}</span>
            <span class="stat-label">{stat.label}</span>
          </div>
        {/each}
      </div>

      <EventLog log={queue.log} />
    </div>
  </div>

  <footer>
    <div class="how-it-works">
      {#if selected === 'job-queue'}
        <h3>How Job Queues Work</h3>
        <p>
          A <strong>job queue</strong> decouples work producers from consumers. Jobs are added to a
          <strong>FIFO queue</strong> and workers pull them off independently. Failed jobs are <strong>retried</strong>
          up to a configurable limit. After exhausting retries, jobs move to a <strong>dead-letter queue (DLQ)</strong>
          for manual inspection. This pattern is used for background processing like sending emails,
          resizing images, and generating reports.
        </p>
      {:else if selected === 'message-queue'}
        <h3>How Message Queues Work</h3>
        <p>
          A <strong>message queue</strong> enables <strong>publish/subscribe</strong> (pub/sub) communication.
          Producers publish messages to <strong>topics</strong>, and consumers subscribe to topics they care about.
          Each message is <strong>acknowledged</strong> after processing to ensure at-least-once delivery.
          This decouples services and enables event-driven architectures. Common implementations include
          <code>RabbitMQ</code>, <code>Apache Kafka</code>, and <code>AWS SQS</code>.
        </p>
      {:else if selected === 'priority-queue'}
        <h3>How Priority Queues Work</h3>
        <p>
          A <strong>priority queue</strong> processes higher-priority items first. Items are sorted into
          <strong>lanes</strong> (Critical, Normal, Low). Workers always pick from the highest-priority
          non-empty lane. To prevent <strong>starvation</strong> of low-priority items, a promotion
          mechanism bumps items up after waiting too long. This pattern is essential for systems handling
          mixed-criticality workloads like payment processing alongside batch reports.
        </p>
      {/if}
    </div>
  </footer>

  <AppFooter />
</main>
