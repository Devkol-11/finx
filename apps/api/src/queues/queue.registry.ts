import { Queue, JobsOptions } from 'bullmq';
import { env } from '../config/env';

export const QUEUE_NAMES = {
  EMAIL: 'email',
  PAYMENT: 'payment',
  VIRTUAL_ACCOUNT_CREATION: 'virtual_account_creation'
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  EMAIL: {
    SEND: 'send-email'
  },
  PAYMENT: {
    CAPTURE: 'capture-payment'
  },

  VIRTUAL_ACCOUNT_CREATION: {
    CREATE: 'create-virtual-account'
  }
} as const;

const queueMap = new Map<QueueName, Queue>();

function createQueue(name: QueueName): Queue {
  if (queueMap.has(name)) {
    return queueMap.get(name)!;
  }

  const queue = new Queue(name, {
    connection: {
      url: env.REDIS_URL
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  });

  queueMap.set(name, queue);
  return queue;
}

export function getQueue(name: QueueName): Queue {
  if (queueMap.has(name)) {
    return queueMap.get(name)!;
  }

  return createQueue(name);
}

export async function dispatchJob(queueName: QueueName, jobName: string, payload: unknown, options?: JobsOptions) {
  if (!jobName || !jobName.trim()) {
    throw new Error('jobName is required');
  }

  const queue = getQueue(queueName);
  return queue.add(jobName, payload, options);
}
