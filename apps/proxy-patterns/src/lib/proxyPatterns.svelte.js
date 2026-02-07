/**
 * Proxy pattern implementations using Svelte 5 runes.
 * Each returns a reactive object with `sendRequest()` and visual state.
 */

/**
 * Reverse Proxy: routes requests to different backend services based on path.
 */
export function createReverseProxy() {
  let routes = $state([
    { path: "/api", service: "API Service", port: 3001, color: "#3b82f6" },
    { path: "/web", service: "Web Service", port: 3002, color: "#8b5cf6" },
    { path: "/images", service: "Image Service", port: 3003, color: "#f59e0b" },
  ]);
  let log = $state([]);
  let animating = $state(null);
  let stats = $state({ total: 0, routed: 0, failed: 0 });

  function sendRequest(path) {
    const route = routes.find((r) => r.path === path);
    const now = Date.now();
    stats = { ...stats, total: stats.total + 1 };

    if (route) {
      stats = { ...stats, routed: stats.routed + 1 };
      animating = {
        id: crypto.randomUUID(),
        path,
        target: route,
        status: "routing",
      };
      const entry = {
        id: crypto.randomUUID(),
        time: now,
        accepted: true,
        message: `GET ${path} → routed to ${route.service} (port ${route.port})`,
      };
      log = [entry, ...log].slice(0, 50);

      setTimeout(() => {
        animating = null;
      }, 1200);
    } else {
      stats = { ...stats, failed: stats.failed + 1 };
      animating = {
        id: crypto.randomUUID(),
        path,
        target: null,
        status: "failed",
      };
      const entry = {
        id: crypto.randomUUID(),
        time: now,
        accepted: false,
        message: `GET ${path} → 404 No route found`,
      };
      log = [entry, ...log].slice(0, 50);

      setTimeout(() => {
        animating = null;
      }, 800);
    }
  }

  function reset() {
    log = [];
    animating = null;
    stats = { total: 0, routed: 0, failed: 0 };
  }

  return {
    get routes() {
      return routes;
    },
    get log() {
      return log;
    },
    get animating() {
      return animating;
    },
    get stats() {
      return stats;
    },
    sendRequest,
    reset,
    destroy() {},
  };
}

/**
 * Load Balancer: distributes requests across identical backend instances.
 */
export function createLoadBalancer(initialAlgorithm = "round-robin") {
  let instances = $state([
    { id: 1, name: "App Server", port: 3001, connections: 0, requestCount: 0 },
    { id: 2, name: "App Server", port: 3002, connections: 0, requestCount: 0 },
    { id: 3, name: "App Server", port: 3003, connections: 0, requestCount: 0 },
  ]);
  let algorithm = $state(initialAlgorithm);
  let currentIndex = $state(0);
  let log = $state([]);
  let animating = $state(null);
  let stats = $state({ total: 0, routed: 0 });

  function pickInstance() {
    if (algorithm === "round-robin") {
      const idx = currentIndex % instances.length;
      currentIndex = currentIndex + 1;
      return idx;
    }
    // least-connections
    let minConn = Number.POSITIVE_INFINITY;
    let minIdx = 0;
    for (let i = 0; i < instances.length; i++) {
      if (instances[i].connections < minConn) {
        minConn = instances[i].connections;
        minIdx = i;
      }
    }
    return minIdx;
  }

  function sendRequest() {
    const idx = pickInstance();
    const instance = instances[idx];
    const now = Date.now();

    instances = instances.map((inst, i) =>
      i === idx
        ? {
            ...inst,
            requestCount: inst.requestCount + 1,
            connections: inst.connections + 1,
          }
        : inst,
    );

    stats = { total: stats.total + 1, routed: stats.routed + 1 };

    animating = {
      id: crypto.randomUUID(),
      targetIndex: idx,
      target: instance,
      status: "routing",
    };

    const algoLabel = algorithm === "round-robin" ? "round-robin" : "least-connections";
    const entry = {
      id: crypto.randomUUID(),
      time: now,
      accepted: true,
      message: `Request → Instance ${instance.id} (port ${instance.port}) [${algoLabel}]`,
    };
    log = [entry, ...log].slice(0, 50);

    setTimeout(
      () => {
        instances = instances.map((inst, i) =>
          i === idx ? { ...inst, connections: Math.max(0, inst.connections - 1) } : inst,
        );
      },
      800 + Math.random() * 400,
    );

    setTimeout(() => {
      animating = null;
    }, 1200);
  }

  function setAlgorithm(algo) {
    algorithm = algo;
    currentIndex = 0;
  }

  function setInstanceCount(count) {
    const clamped = Math.max(1, Math.min(5, count));
    if (clamped === instances.length) return;
    if (clamped > instances.length) {
      const newInstances = [...instances];
      for (let i = instances.length; i < clamped; i++) {
        newInstances.push({
          id: i + 1,
          name: "App Server",
          port: 3001 + i,
          connections: 0,
          requestCount: 0,
        });
      }
      instances = newInstances;
    } else {
      instances = instances.slice(0, clamped);
    }
    currentIndex = 0;
  }

  function reset() {
    instances = instances.map((inst) => ({
      ...inst,
      connections: 0,
      requestCount: 0,
    }));
    log = [];
    animating = null;
    currentIndex = 0;
    stats = { total: 0, routed: 0 };
  }

  return {
    get instances() {
      return instances;
    },
    get algorithm() {
      return algorithm;
    },
    get currentIndex() {
      return currentIndex;
    },
    get log() {
      return log;
    },
    get animating() {
      return animating;
    },
    get stats() {
      return stats;
    },
    sendRequest,
    setAlgorithm,
    setInstanceCount,
    reset,
    destroy() {},
  };
}

/**
 * API Gateway: request passes through a middleware pipeline before routing.
 */
export function createApiGateway() {
  let pipeline = $state([
    { id: "auth", name: "Auth", enabled: true, color: "#3b82f6" },
    { id: "rate-limit", name: "Rate Limit", enabled: true, color: "#f59e0b" },
    { id: "transform", name: "Transform", enabled: true, color: "#8b5cf6" },
  ]);
  let services = $state([
    { path: "/users", service: "Users Service", color: "#10b981" },
    { path: "/orders", service: "Orders Service", color: "#ec4899" },
  ]);
  let log = $state([]);
  let animating = $state(null);
  let stats = $state({ total: 0, routed: 0, authFailed: 0, rateLimited: 0 });
  let requestCounter = $state(0);
  let rateWindow = $state([]);

  function sendRequest(path) {
    const now = Date.now();
    stats = { ...stats, total: stats.total + 1 };

    const enabledSteps = pipeline.filter((s) => s.enabled);
    const service = services.find((s) => s.path === path);

    animating = {
      id: crypto.randomUUID(),
      path,
      steps: enabledSteps.map((s) => ({ ...s, status: "pending" })),
      target: service,
      currentStep: 0,
      status: "processing",
    };

    let stepDelay = 0;
    let failed = false;

    for (let i = 0; i < enabledSteps.length; i++) {
      const step = enabledSteps[i];
      stepDelay += 400;

      setTimeout(() => {
        if (failed) return;

        // Check middleware pass/fail
        let passed = true;
        let failReason = "";

        if (step.id === "auth") {
          // ~15% chance to fail auth
          passed = Math.random() > 0.15;
          if (!passed) failReason = "401 Unauthorized";
        } else if (step.id === "rate-limit") {
          // Simple rate window check
          const windowCutoff = Date.now() - 3000;
          rateWindow = rateWindow.filter((t) => t > windowCutoff);
          if (rateWindow.length >= 8) {
            passed = false;
            failReason = "429 Rate Limited";
          } else {
            rateWindow = [...rateWindow, Date.now()];
          }
        }

        if (!passed) {
          failed = true;
          if (step.id === "auth") {
            stats = { ...stats, authFailed: stats.authFailed + 1 };
          } else if (step.id === "rate-limit") {
            stats = { ...stats, rateLimited: stats.rateLimited + 1 };
          }

          animating = animating
            ? {
                ...animating,
                steps: animating.steps.map((s, idx) =>
                  idx === i ? { ...s, status: "failed" } : idx < i ? { ...s, status: "passed" } : s,
                ),
                status: "failed",
              }
            : null;

          const entry = {
            id: crypto.randomUUID(),
            time: now,
            accepted: false,
            message: `GET ${path} → ${step.name}: ${failReason}`,
          };
          log = [entry, ...log].slice(0, 50);

          setTimeout(() => {
            animating = null;
          }, 600);
          return;
        }

        // Step passed
        if (animating) {
          animating = {
            ...animating,
            steps: animating.steps.map((s, idx) => (idx === i ? { ...s, status: "passed" } : s)),
            currentStep: i + 1,
          };
        }

        // Last step — route to service
        if (i === enabledSteps.length - 1) {
          setTimeout(() => {
            stats = { ...stats, routed: stats.routed + 1 };
            requestCounter = requestCounter + 1;

            if (animating) {
              animating = { ...animating, status: "routed" };
            }

            const svcName = service ? service.service : "Unknown Service";
            const entry = {
              id: crypto.randomUUID(),
              time: now,
              accepted: true,
              message: `GET ${path} → [${enabledSteps.map((s) => s.name).join(" → ")}] → ${svcName}`,
            };
            log = [entry, ...log].slice(0, 50);

            setTimeout(() => {
              animating = null;
            }, 600);
          }, 300);
        }
      }, stepDelay);
    }

    // If no middleware enabled, route directly
    if (enabledSteps.length === 0) {
      stats = { ...stats, routed: stats.routed + 1 };
      requestCounter = requestCounter + 1;

      const svcName = service ? service.service : "Unknown Service";
      const entry = {
        id: crypto.randomUUID(),
        time: now,
        accepted: true,
        message: `GET ${path} → (no middleware) → ${svcName}`,
      };
      log = [entry, ...log].slice(0, 50);

      if (animating) {
        animating = { ...animating, status: "routed" };
      }
      setTimeout(() => {
        animating = null;
      }, 800);
    }
  }

  function toggleMiddleware(id) {
    pipeline = pipeline.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
  }

  function reset() {
    log = [];
    animating = null;
    stats = { total: 0, routed: 0, authFailed: 0, rateLimited: 0 };
    requestCounter = 0;
    rateWindow = [];
  }

  return {
    get pipeline() {
      return pipeline;
    },
    get services() {
      return services;
    },
    get log() {
      return log;
    },
    get animating() {
      return animating;
    },
    get stats() {
      return stats;
    },
    sendRequest,
    toggleMiddleware,
    reset,
    destroy() {},
  };
}
