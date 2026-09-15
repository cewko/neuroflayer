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

  function cancelPending() {
    const error = new Error("request cancelled");
    active?.abort(error);

    for (const job of jobs.splice(0)) {
      job.reject(error);
    }
  }

  return {
    run(task) {
      return new Promise((resolve, reject) => {
        if (closed) {
          reject(new Error("queue is stopped"));
          return;
        }

        if (jobs.length >= maxPending) {
          reject(new Error("request queue is full"));
          return;
        }

        jobs.push({ task, resolve, reject, queuedAt: now() });
        void drain();
      });
    },

    cancelPending,

    stop() {
      closed = true;
      cancelPending();
    },

    status: () => ({
      busy: active !== null,
      queued: jobs.length,
    }),
  };
}
