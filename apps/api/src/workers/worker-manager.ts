import { Worker, QueueEvents } from "bullmq";
import type { Job } from "bullmq";
import { QUEUE_NAMES, QueueName, JOB_NAMES } from "../queues/queue.registry";
import { handleEmailJob } from "./handlers/email.handler";
import { handlePaymentJob } from "./handlers/payment.handler";
import { env } from "../config/env";
import { appConfig } from "../config/app.config";

const workers = new Map<QueueName, Worker>();
const queueEvents = new Map<QueueName, QueueEvents>();

type QueuePayload = unknown;

type QueueHandler<T = QueuePayload> = (payload: T) => Promise<unknown>;

const queueHandlers: Record<QueueName, Record<string, QueueHandler>> = {
  [QUEUE_NAMES.EMAIL]: {
    [JOB_NAMES.EMAIL.SEND]: handleEmailJob,
  },
  [QUEUE_NAMES.PAYMENT]: {
    [JOB_NAMES.PAYMENT.CAPTURE]: handlePaymentJob,
  },
};

const processJob = async (job: Job<unknown>): Promise<unknown> => {
  const queueName = job.queueName as QueueName;
  const queueHandlersByName = queueHandlers[queueName];

  if (!queueHandlersByName) {
    const msg = `Unknown queue: ${queueName}`;
    console.error(msg);
    throw new Error(msg);
  }

  const jobName = job.name;
  const handler = queueHandlersByName[jobName];

  if (!handler) {
    const msg = `Unknown handler for queue=${queueName} job=${jobName}`;
    console.error(msg);
    throw new Error(msg);
  }

  if (!job.data || typeof job.data !== "object") {
    throw new Error("Invalid job payload: must be a non-null object");
  }

  if (appConfig.isDev) {
    console.log(`[WORKER] ${queueName} job started`, {
      jobId: job.id,
      name: jobName,
      data: job.data,
    });
  }

  return handler(job.data);
};

export const startWorkers = async () => {
  for (const queueName of Object.values(QUEUE_NAMES) as QueueName[]) {
    if (workers.has(queueName)) {
      continue;
    }

    const worker = new Worker(queueName, processJob, {
      connection: {
        url: env.REDIS_URL,
        maxRetriesPerRequest: null,
      },
      concurrency: 5,
      lockDuration: 300000,
      autorun: true,
    });

    worker.on("error", (error) => {
      console.error(`[WORKER] error on queue ${queueName}`);
      console.error(error);
    });

    worker.on("failed", (job, err) => {
      console.warn(`[WORKER] job failed queue=${queueName} id=${job?.id}`, err);
    });

    const events = new QueueEvents(queueName, {
      connection: {
        url: env.REDIS_URL,
      },
    });

    events.on("completed", ({ jobId, returnvalue }) => {
      console.log(
        `[QUEUE_EVENTS] completed queue=${queueName} jobId=${jobId}`,
        returnvalue
      );
    });

    events.on("failed", ({ jobId, failedReason }) => {
      console.error(
        `[QUEUE_EVENTS] failed queue=${queueName} jobId=${jobId} reason=${failedReason}`
      );
    });

    workers.set(queueName, worker);
    queueEvents.set(queueName, events);

    console.log(`[WORKER] started worker for queue ${queueName}`);
  }
};

export const shutdownWorkers = async () => {
  for (const [queueName, worker] of workers.entries()) {
    try {
      await worker.close();
      console.log(`[WORKER] closed worker for queue ${queueName}`);
    } catch (err) {
      console.error(`[WORKER] error closing worker for queue ${queueName}`);
      console.error(err);
    }
    workers.delete(queueName);
  }

  for (const [queueName, events] of queueEvents.entries()) {
    try {
      await events.close();
      console.log(`[QUEUE_EVENTS] closed events for queue ${queueName}`);
    } catch (err) {
      console.error(
        `[QUEUE_EVENTS] error closing events for queue ${queueName}`
      );
      console.error(err);
    }
    queueEvents.delete(queueName);
  }
};
