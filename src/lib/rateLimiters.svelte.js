/**
 * Rate limiter algorithm implementations using Svelte 5 runes.
 * Each returns a reactive object with `tryRequest()` and visual state.
 */

/**
 * Token Bucket: tokens refill at a steady rate, each request costs one token.
 */
export function createTokenBucket(capacity = 10, refillRate = 2) {
  let tokens = $state(capacity);
  let maxTokens = $state(capacity);
  let rate = $state(refillRate);
  let log = $state([]);
  let intervalId = null;

  function start() {
    stop();
    intervalId = setInterval(() => {
      if (tokens < maxTokens) {
        tokens = Math.min(maxTokens, tokens + 1);
      }
    }, 1000 / rate);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
  }

  function tryRequest() {
    const now = Date.now();
    if (tokens > 0) {
      tokens--;
      const entry = { time: now, accepted: true, id: crypto.randomUUID() };
      log = [entry, ...log].slice(0, 50);
      return true;
    }
    const entry = { time: now, accepted: false, id: crypto.randomUUID() };
    log = [entry, ...log].slice(0, 50);
    return false;
  }

  function reset() {
    tokens = maxTokens;
    log = [];
  }

  function setCapacity(c) {
    maxTokens = c;
    tokens = Math.min(tokens, c);
  }

  function setRate(r) {
    rate = r;
    start();
  }

  start();

  return {
    get tokens() { return tokens; },
    get maxTokens() { return maxTokens; },
    get rate() { return rate; },
    get log() { return log; },
    tryRequest,
    reset,
    setCapacity,
    setRate,
    destroy: stop,
  };
}

/**
 * Fixed Window: count requests in discrete time windows.
 */
export function createFixedWindow(maxRequests = 5, windowSizeMs = 5000) {
  let count = $state(0);
  let limit = $state(maxRequests);
  let windowSize = $state(windowSizeMs);
  let windowStart = $state(Date.now());
  let log = $state([]);
  let intervalId = null;

  function start() {
    stop();
    windowStart = Date.now();
    count = 0;
    intervalId = setInterval(() => {
      windowStart = Date.now();
      count = 0;
    }, windowSize);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
  }

  function tryRequest() {
    const now = Date.now();
    if (count < limit) {
      count++;
      const entry = { time: now, accepted: true, id: crypto.randomUUID() };
      log = [entry, ...log].slice(0, 50);
      return true;
    }
    const entry = { time: now, accepted: false, id: crypto.randomUUID() };
    log = [entry, ...log].slice(0, 50);
    return false;
  }

  function reset() {
    count = 0;
    windowStart = Date.now();
    log = [];
  }

  function setLimit(l) { limit = l; }
  function setWindowSize(w) {
    windowSize = w;
    start();
  }

  function getWindowProgress() {
    return Math.min(1, (Date.now() - windowStart) / windowSize);
  }

  start();

  return {
    get count() { return count; },
    get limit() { return limit; },
    get windowSize() { return windowSize; },
    get windowStart() { return windowStart; },
    get log() { return log; },
    getWindowProgress,
    tryRequest,
    reset,
    setLimit,
    setWindowSize,
    destroy: stop,
  };
}

/**
 * Sliding Window Log: track timestamps, count those within the window.
 */
export function createSlidingWindowLog(maxRequests = 5, windowSizeMs = 5000) {
  let timestamps = $state([]);
  let limit = $state(maxRequests);
  let windowSize = $state(windowSizeMs);
  let log = $state([]);

  function prune() {
    const cutoff = Date.now() - windowSize;
    timestamps = timestamps.filter(t => t > cutoff);
  }

  function tryRequest() {
    prune();
    const now = Date.now();
    if (timestamps.length < limit) {
      timestamps = [...timestamps, now];
      const entry = { time: now, accepted: true, id: crypto.randomUUID() };
      log = [entry, ...log].slice(0, 50);
      return true;
    }
    const entry = { time: now, accepted: false, id: crypto.randomUUID() };
    log = [entry, ...log].slice(0, 50);
    return false;
  }

  function reset() {
    timestamps = [];
    log = [];
  }

  function setLimit(l) { limit = l; }
  function setWindowSize(w) { windowSize = w; }

  function getActiveCount() {
    const cutoff = Date.now() - windowSize;
    return timestamps.filter(t => t > cutoff).length;
  }

  function getTimestamps() {
    const cutoff = Date.now() - windowSize;
    return timestamps.filter(t => t > cutoff);
  }

  return {
    get count() { return getActiveCount(); },
    get limit() { return limit; },
    get windowSize() { return windowSize; },
    get log() { return log; },
    get timestamps() { return getTimestamps(); },
    tryRequest,
    reset,
    setLimit,
    setWindowSize,
    destroy() {},
  };
}

/**
 * Leaky Bucket: requests enter a queue that drains at a constant rate.
 */
export function createLeakyBucket(capacity = 10, drainRate = 2) {
  let queue = $state(0);
  let maxQueue = $state(capacity);
  let rate = $state(drainRate);
  let log = $state([]);
  let intervalId = null;

  function start() {
    stop();
    intervalId = setInterval(() => {
      if (queue > 0) {
        queue--;
      }
    }, 1000 / rate);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
  }

  function tryRequest() {
    const now = Date.now();
    if (queue < maxQueue) {
      queue++;
      const entry = { time: now, accepted: true, id: crypto.randomUUID() };
      log = [entry, ...log].slice(0, 50);
      return true;
    }
    const entry = { time: now, accepted: false, id: crypto.randomUUID() };
    log = [entry, ...log].slice(0, 50);
    return false;
  }

  function reset() {
    queue = 0;
    log = [];
  }

  function setCapacity(c) {
    maxQueue = c;
    queue = Math.min(queue, c);
  }

  function setRate(r) {
    rate = r;
    start();
  }

  start();

  return {
    get queue() { return queue; },
    get maxQueue() { return maxQueue; },
    get rate() { return rate; },
    get log() { return log; },
    tryRequest,
    reset,
    setCapacity,
    setRate,
    destroy: stop,
  };
}
