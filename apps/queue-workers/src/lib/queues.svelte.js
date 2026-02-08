/**
 * Queue & Worker implementations using Svelte 5 runes.
 * Three patterns: Job Queue (FIFO), Message Queue (pub/sub), Priority Queue.
 */

let nextId = 1;
function uid() {
  return `job-${nextId++}`;
}

// ── Job Types ──────────────────────────────────────────────

const JOB_TYPES = [
  { type: "email", label: "Send Email", minMs: 1000, maxMs: 2000, color: "#3b82f6" },
  { type: "image", label: "Resize Image", minMs: 3000, maxMs: 5000, color: "#8b5cf6" },
  { type: "pdf", label: "Generate PDF", minMs: 5000, maxMs: 8000, color: "#f59e0b" },
  { type: "export", label: "Data Export", minMs: 4000, maxMs: 7000, color: "#10b981" },
  { type: "push", label: "Push Notification", minMs: 500, maxMs: 1000, color: "#ec4899" },
];

const MESSAGE_TYPES = [
  { type: "order-placed", label: "Order Placed", topic: "orders", color: "#3b82f6" },
  { type: "payment-received", label: "Payment Received", topic: "orders", color: "#10b981" },
  { type: "user-signup", label: "User Signup", topic: "notifications", color: "#8b5cf6" },
  { type: "page-view", label: "Page View", topic: "analytics", color: "#f59e0b" },
  { type: "alert-triggered", label: "Alert Triggered", topic: "notifications", color: "#ef4444" },
];

const PRIORITY_JOB_TYPES = {
  critical: [
    { type: "security-alert", label: "Security Alert", minMs: 1000, maxMs: 2000, color: "#ef4444" },
    {
      type: "payment-failure",
      label: "Payment Failure",
      minMs: 1500,
      maxMs: 3000,
      color: "#f97316",
    },
  ],
  normal: [
    { type: "send-email", label: "Send Email", minMs: 1500, maxMs: 3000, color: "#3b82f6" },
    { type: "notification", label: "Notification", minMs: 1000, maxMs: 2000, color: "#6366f1" },
  ],
  low: [
    { type: "report", label: "Generate Report", minMs: 3000, maxMs: 6000, color: "#6b7280" },
    { type: "cleanup", label: "Cleanup Task", minMs: 2000, maxMs: 4000, color: "#9ca3af" },
  ],
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── 1. Job Queue (FIFO with workers) ──────────────────────

export function createJobQueue(initialWorkers = 2) {
  let queue = $state([]);
  let processing = $state([]);
  let completed = $state([]);
  let failed = $state([]);
  let dlq = $state([]);
  let log = $state([]);
  let workerCount = $state(initialWorkers);
  let failureRate = $state(10);
  let workers = $state([]);
  let intervalIds = [];

  function addLog(message, type = "info") {
    log = [{ id: uid(), message, type, time: Date.now() }, ...log].slice(0, 80);
  }

  function createJob(jobType) {
    const def = jobType || pickRandom(JOB_TYPES);
    const duration = randomBetween(def.minMs, def.maxMs);
    return {
      id: uid(),
      type: def.type,
      label: def.label,
      color: def.color,
      status: "queued",
      progress: 0,
      duration,
      retries: 0,
      maxRetries: 3,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };
  }

  function enqueue(jobType) {
    const job = createJob(jobType);
    queue = [...queue, job];
    addLog(`Enqueued: ${job.label}`, "enqueue");
  }

  function processNext(workerIndex) {
    if (queue.length === 0) return;
    const job = queue[0];
    queue = queue.slice(1);
    job.status = "processing";
    job.startedAt = Date.now();
    job.progress = 0;
    processing = [...processing, job];

    workers = workers.map((w, i) =>
      i === workerIndex
        ? { ...w, busy: true, jobId: job.id, jobLabel: job.label, jobColor: job.color }
        : w,
    );

    addLog(`Worker ${workerIndex + 1} processing: ${job.label}`, "process");

    const steps = 20;
    const stepTime = job.duration / steps;
    let step = 0;

    const intervalId = setInterval(() => {
      step++;
      const pJob = processing.find((j) => j.id === job.id);
      if (!pJob) {
        clearInterval(intervalId);
        return;
      }

      processing = processing.map((j) =>
        j.id === job.id ? { ...j, progress: Math.min(100, (step / steps) * 100) } : j,
      );

      if (step >= steps) {
        clearInterval(intervalId);
        const didFail = Math.random() * 100 < failureRate;

        processing = processing.filter((j) => j.id !== job.id);
        workers = workers.map((w, i) =>
          i === workerIndex
            ? { ...w, busy: false, jobId: null, jobLabel: null, jobColor: null }
            : w,
        );

        if (didFail) {
          if (job.retries < job.maxRetries - 1) {
            const retried = {
              ...job,
              status: "queued",
              progress: 0,
              retries: job.retries + 1,
              startedAt: null,
            };
            queue = [...queue, retried];
            addLog(
              `Failed & retrying (${retried.retries}/${retried.maxRetries}): ${job.label}`,
              "retry",
            );
          } else {
            const deadJob = { ...job, status: "dead", completedAt: Date.now() };
            dlq = [...dlq, deadJob];
            addLog(`Dead-lettered after ${job.maxRetries} attempts: ${job.label}`, "dlq");
          }
          failed = [...failed, { ...job, status: "failed", completedAt: Date.now() }];
        } else {
          const done = { ...job, status: "completed", progress: 100, completedAt: Date.now() };
          completed = [done, ...completed].slice(0, 30);
          addLog(`Completed: ${job.label}`, "complete");
        }

        // Try next job
        setTimeout(() => processNext(workerIndex), 100);
      }
    }, stepTime);

    intervalIds.push(intervalId);
  }

  function initWorkers() {
    // Stop all current processing
    for (const id of intervalIds) clearInterval(id);
    intervalIds = [];

    workers = Array.from({ length: workerCount }, (_, i) => ({
      id: i,
      busy: false,
      jobId: null,
      jobLabel: null,
      jobColor: null,
    }));

    // Move any in-progress items back to queue
    if (processing.length > 0) {
      queue = [
        ...processing.map((j) => ({ ...j, status: "queued", progress: 0, startedAt: null })),
        ...queue,
      ];
      processing = [];
    }

    // Start pulling from queue
    for (let i = 0; i < workerCount; i++) {
      processNext(i);
    }
  }

  function setWorkerCount(count) {
    workerCount = count;
    initWorkers();
  }

  function setFailureRate(rate) {
    failureRate = rate;
  }

  function reset() {
    for (const id of intervalIds) clearInterval(id);
    intervalIds = [];
    queue = [];
    processing = [];
    completed = [];
    failed = [];
    dlq = [];
    log = [];
    initWorkers();
  }

  function destroy() {
    for (const id of intervalIds) clearInterval(id);
    intervalIds = [];
  }

  // Kick off a poll loop so idle workers pick up new jobs
  const pollId = setInterval(() => {
    for (let i = 0; i < workers.length; i++) {
      if (!workers[i]?.busy && queue.length > 0) {
        processNext(i);
      }
    }
  }, 200);

  initWorkers();

  return {
    get queue() {
      return queue;
    },
    get processing() {
      return processing;
    },
    get completed() {
      return completed;
    },
    get failed() {
      return failed;
    },
    get dlq() {
      return dlq;
    },
    get log() {
      return log;
    },
    get workers() {
      return workers;
    },
    get workerCount() {
      return workerCount;
    },
    get failureRate() {
      return failureRate;
    },
    get jobTypes() {
      return JOB_TYPES;
    },
    enqueue,
    setWorkerCount,
    setFailureRate,
    reset,
    destroy() {
      destroy();
      clearInterval(pollId);
    },
  };
}

// ── 2. Message Queue (pub/sub with topics) ────────────────

export function createMessageQueue(initialConsumers = 2) {
  const TOPICS = ["orders", "notifications", "analytics"];

  let messages = $state([]);
  let pending = $state({ orders: [], notifications: [], analytics: [] });
  let delivered = $state([]);
  let log = $state([]);
  let consumerCount = $state(initialConsumers);
  let consumers = $state([]);
  let publishedCount = $state(0);
  let acknowledgedCount = $state(0);
  let intervalIds = [];

  function addLog(message, type = "info") {
    log = [{ id: uid(), message, type, time: Date.now() }, ...log].slice(0, 80);
  }

  function publish(msgType) {
    const def = msgType || pickRandom(MESSAGE_TYPES);
    const msg = {
      id: uid(),
      type: def.type,
      label: def.label,
      topic: def.topic,
      color: def.color,
      status: "pending",
      createdAt: Date.now(),
      deliveredAt: null,
    };

    const topicPending = [...(pending[def.topic] || []), msg];
    pending = { ...pending, [def.topic]: topicPending };
    messages = [...messages, msg];
    publishedCount++;
    addLog(`Published to ${def.topic}: ${def.label}`, "publish");
  }

  function consumeNext(consumerIndex) {
    // Round-robin across topics based on consumer index
    const topicIndex = consumerIndex % TOPICS.length;
    const startTopic = topicIndex;
    let tried = 0;

    while (tried < TOPICS.length) {
      const topic = TOPICS[(startTopic + tried) % TOPICS.length];
      const topicMessages = pending[topic] || [];
      if (topicMessages.length > 0) {
        const msg = topicMessages[0];
        pending = { ...pending, [topic]: topicMessages.slice(1) };

        const processingMsg = { ...msg, status: "processing" };
        consumers = consumers.map((c, i) =>
          i === consumerIndex
            ? {
                ...c,
                busy: true,
                messageId: msg.id,
                messageLabel: msg.label,
                messageColor: msg.color,
                topic,
              }
            : c,
        );

        addLog(`Consumer ${consumerIndex + 1} processing from ${topic}: ${msg.label}`, "consume");

        // Simulate processing time (0.5-2s)
        const processTime = randomBetween(500, 2000);
        const timeoutId = setTimeout(() => {
          const done = { ...processingMsg, status: "delivered", deliveredAt: Date.now() };
          delivered = [done, ...delivered].slice(0, 30);
          acknowledgedCount++;
          consumers = consumers.map((c, i) =>
            i === consumerIndex
              ? {
                  ...c,
                  busy: false,
                  messageId: null,
                  messageLabel: null,
                  messageColor: null,
                  topic: null,
                }
              : c,
          );
          addLog(`Acknowledged from ${topic}: ${msg.label}`, "ack");
          setTimeout(() => consumeNext(consumerIndex), 100);
        }, processTime);

        intervalIds.push(timeoutId);
        return;
      }
      tried++;
    }
  }

  function initConsumers() {
    for (const id of intervalIds) clearTimeout(id);
    intervalIds = [];

    consumers = Array.from({ length: consumerCount }, (_, i) => ({
      id: i,
      busy: false,
      messageId: null,
      messageLabel: null,
      messageColor: null,
      topic: null,
    }));

    for (let i = 0; i < consumerCount; i++) {
      consumeNext(i);
    }
  }

  function setConsumerCount(count) {
    consumerCount = count;
    initConsumers();
  }

  function reset() {
    for (const id of intervalIds) clearTimeout(id);
    intervalIds = [];
    messages = [];
    pending = { orders: [], notifications: [], analytics: [] };
    delivered = [];
    log = [];
    publishedCount = 0;
    acknowledgedCount = 0;
    initConsumers();
  }

  // Poll loop for idle consumers
  const pollId = setInterval(() => {
    for (let i = 0; i < consumers.length; i++) {
      if (!consumers[i]?.busy) {
        const hasPending = TOPICS.some((t) => (pending[t] || []).length > 0);
        if (hasPending) consumeNext(i);
      }
    }
  }, 200);

  initConsumers();

  return {
    get messages() {
      return messages;
    },
    get pending() {
      return pending;
    },
    get delivered() {
      return delivered;
    },
    get log() {
      return log;
    },
    get consumers() {
      return consumers;
    },
    get consumerCount() {
      return consumerCount;
    },
    get publishedCount() {
      return publishedCount;
    },
    get acknowledgedCount() {
      return acknowledgedCount;
    },
    get topics() {
      return TOPICS;
    },
    get messageTypes() {
      return MESSAGE_TYPES;
    },
    get pendingCount() {
      return TOPICS.reduce((sum, t) => sum + (pending[t] || []).length, 0);
    },
    publish,
    setConsumerCount,
    reset,
    destroy() {
      for (const id of intervalIds) clearTimeout(id);
      clearInterval(pollId);
    },
  };
}

// ── 3. Priority Queue (with starvation prevention) ────────

export function createPriorityQueue(initialWorkers = 2) {
  let lanes = $state({ critical: [], normal: [], low: [] });
  let processing = $state([]);
  let completed = $state([]);
  let log = $state([]);
  let workerCount = $state(initialWorkers);
  let failureRate = $state(10);
  let workers = $state([]);
  let promotions = $state(0);
  let intervalIds = [];

  const PRIORITIES = ["critical", "normal", "low"];
  const PRIORITY_COLORS = { critical: "#ef4444", normal: "#3b82f6", low: "#6b7280" };
  const PROMOTION_THRESHOLD_MS = 10000;

  function addLog(message, type = "info") {
    log = [{ id: uid(), message, type, time: Date.now() }, ...log].slice(0, 80);
  }

  function createPriorityJob(priority, jobType) {
    const types = PRIORITY_JOB_TYPES[priority];
    const def = jobType || pickRandom(types);
    const duration = randomBetween(def.minMs, def.maxMs);
    return {
      id: uid(),
      type: def.type,
      label: def.label,
      color: def.color,
      priority,
      status: "queued",
      progress: 0,
      duration,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };
  }

  function enqueue(priority, jobType) {
    const job = createPriorityJob(priority, jobType);
    lanes = { ...lanes, [priority]: [...lanes[priority], job] };
    addLog(`Enqueued [${priority.toUpperCase()}]: ${job.label}`, "enqueue");
  }

  function enqueueRandom() {
    const weights = { critical: 0.15, normal: 0.55, low: 0.3 };
    const roll = Math.random();
    let priority;
    if (roll < weights.critical) priority = "critical";
    else if (roll < weights.critical + weights.normal) priority = "normal";
    else priority = "low";
    enqueue(priority);
  }

  function pickNext() {
    // Always pick from highest-priority non-empty lane
    for (const p of PRIORITIES) {
      if (lanes[p].length > 0) {
        const job = lanes[p][0];
        lanes = { ...lanes, [p]: lanes[p].slice(1) };
        return job;
      }
    }
    return null;
  }

  function processNext(workerIndex) {
    const job = pickNext();
    if (!job) return;

    job.status = "processing";
    job.startedAt = Date.now();
    job.progress = 0;
    processing = [...processing, job];

    workers = workers.map((w, i) =>
      i === workerIndex
        ? {
            ...w,
            busy: true,
            jobId: job.id,
            jobLabel: job.label,
            jobColor: job.color,
            priority: job.priority,
          }
        : w,
    );

    addLog(
      `Worker ${workerIndex + 1} processing [${job.priority.toUpperCase()}]: ${job.label}`,
      "process",
    );

    const steps = 20;
    const stepTime = job.duration / steps;
    let step = 0;

    const intervalId = setInterval(() => {
      step++;
      processing = processing.map((j) =>
        j.id === job.id ? { ...j, progress: Math.min(100, (step / steps) * 100) } : j,
      );

      if (step >= steps) {
        clearInterval(intervalId);
        const didFail = Math.random() * 100 < failureRate;

        processing = processing.filter((j) => j.id !== job.id);
        workers = workers.map((w, i) =>
          i === workerIndex
            ? { ...w, busy: false, jobId: null, jobLabel: null, jobColor: null, priority: null }
            : w,
        );

        if (didFail) {
          addLog(`Failed [${job.priority.toUpperCase()}]: ${job.label}`, "fail");
        } else {
          const done = { ...job, status: "completed", progress: 100, completedAt: Date.now() };
          completed = [done, ...completed].slice(0, 30);
          addLog(`Completed [${job.priority.toUpperCase()}]: ${job.label}`, "complete");
        }

        setTimeout(() => processNext(workerIndex), 100);
      }
    }, stepTime);

    intervalIds.push(intervalId);
  }

  // Starvation prevention: promote items waiting >10s
  function checkPromotions() {
    const now = Date.now();

    // Promote low → normal
    const promotedFromLow = [];
    const remainingLow = [];
    for (const job of lanes.low) {
      if (now - job.createdAt > PROMOTION_THRESHOLD_MS) {
        promotedFromLow.push({ ...job, priority: "normal" });
      } else {
        remainingLow.push(job);
      }
    }

    // Promote normal → critical
    const promotedFromNormal = [];
    const remainingNormal = [];
    for (const job of lanes.normal) {
      if (now - job.createdAt > PROMOTION_THRESHOLD_MS) {
        promotedFromNormal.push({ ...job, priority: "critical" });
      } else {
        remainingNormal.push(job);
      }
    }

    if (promotedFromLow.length > 0 || promotedFromNormal.length > 0) {
      const totalPromoted = promotedFromLow.length + promotedFromNormal.length;
      promotions += totalPromoted;

      lanes = {
        critical: [...lanes.critical, ...promotedFromNormal],
        normal: [...remainingNormal, ...promotedFromLow],
        low: remainingLow,
      };

      if (promotedFromLow.length > 0) {
        addLog(`Promoted ${promotedFromLow.length} from Low → Normal (anti-starvation)`, "promote");
      }
      if (promotedFromNormal.length > 0) {
        addLog(
          `Promoted ${promotedFromNormal.length} from Normal → Critical (anti-starvation)`,
          "promote",
        );
      }
    }
  }

  function initWorkers() {
    for (const id of intervalIds) clearInterval(id);
    intervalIds = [];

    workers = Array.from({ length: workerCount }, (_, i) => ({
      id: i,
      busy: false,
      jobId: null,
      jobLabel: null,
      jobColor: null,
      priority: null,
    }));

    // Move processing back to their lanes
    if (processing.length > 0) {
      for (const job of processing) {
        const p = job.priority;
        lanes = {
          ...lanes,
          [p]: [...lanes[p], { ...job, status: "queued", progress: 0, startedAt: null }],
        };
      }
      processing = [];
    }

    for (let i = 0; i < workerCount; i++) {
      processNext(i);
    }
  }

  function setWorkerCount(count) {
    workerCount = count;
    initWorkers();
  }

  function setFailureRate(rate) {
    failureRate = rate;
  }

  function reset() {
    for (const id of intervalIds) clearInterval(id);
    intervalIds = [];
    lanes = { critical: [], normal: [], low: [] };
    processing = [];
    completed = [];
    log = [];
    promotions = 0;
    initWorkers();
  }

  // Poll loop
  const pollId = setInterval(() => {
    checkPromotions();
    for (let i = 0; i < workers.length; i++) {
      if (!workers[i]?.busy) {
        const hasWork = PRIORITIES.some((p) => lanes[p].length > 0);
        if (hasWork) processNext(i);
      }
    }
  }, 200);

  initWorkers();

  return {
    get lanes() {
      return lanes;
    },
    get processing() {
      return processing;
    },
    get completed() {
      return completed;
    },
    get log() {
      return log;
    },
    get workers() {
      return workers;
    },
    get workerCount() {
      return workerCount;
    },
    get failureRate() {
      return failureRate;
    },
    get promotions() {
      return promotions;
    },
    get priorityColors() {
      return PRIORITY_COLORS;
    },
    get jobTypes() {
      return PRIORITY_JOB_TYPES;
    },
    get totalQueued() {
      return PRIORITIES.reduce((sum, p) => sum + lanes[p].length, 0);
    },
    enqueue,
    enqueueRandom,
    setWorkerCount,
    setFailureRate,
    reset,
    destroy() {
      for (const id of intervalIds) clearInterval(id);
      clearInterval(pollId);
    },
  };
}
