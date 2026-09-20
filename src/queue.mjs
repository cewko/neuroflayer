export function createTaskQueue({ maxPending, queueTtlMs, now = Date.now }) {
  const jobs = [];
  let active = null;
  let closed = false;

  async function drain() {
    if (active || closed) return;

    while (!closed && jobs.length) {
      const job = jobs.shift();

      if (now() - job.queuedAt >= queueTtlMs) {
        job.reject(new Error("queued request expired"));
        continue;
      }

      const request = new AbortController();
      active = request;

      try {
        const result = await job.task(request.signal);
        request.signal.throwIfAborted();
        job.resolve(result);
      } catch (error) {
        job.reject(error);
      } finally {
        active = null;
      }
    }
  }

  function run(task) {
    if (closed) return Promise.reject(new Error("queue is stopped"));
    if (jobs.length >= maxPending)
      return Promise.reject(new Error("request queue is full"));

    return new Promise((resolve, reject) => {
      jobs.push({ task, resolve, reject, queuedAt: now() });
      void drain();
    });
  }

  function cancelPending() {
    const error = new DOMException("request cancelled", "AbortError");
    const pending = jobs.splice(0);
    active?.abort(error);
    for (const job of pending) job.reject(error);
  }

  function stop() {
    closed = true;
    cancelPending();
  }

  return {
    run,
    cancelPending,
    stop,
    status: () => ({ busy: active !== null, queued: jobs.length }),
  };
}
