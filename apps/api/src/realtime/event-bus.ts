import type { LeaderboardSnapshot, WelcomeEvent } from "@streak/contracts";

export type GymEvent = WelcomeEvent | LeaderboardSnapshot;

type Subscription = {
  queue: GymEvent[];
  waiters: Array<(result: IteratorResult<GymEvent>) => void>;
};

export class InMemoryEventBus {
  private readonly subscribers = new Map<string, Set<Subscription>>();

  async publishGymEvent(gymId: string, event: GymEvent): Promise<void> {
    const subscribers = this.subscribers.get(gymId);
    if (!subscribers) return;
    for (const subscription of subscribers) {
      const waiter = subscription.waiters.shift();
      if (waiter) waiter({ value: event, done: false });
      else subscription.queue.push(event);
    }
  }

  subscribeGymEvents(gymId: string): AsyncIterable<GymEvent> {
    const bus = this;
    const subscription: Subscription = { queue: [], waiters: [] };
    const subscribers = bus.subscribers.get(gymId) ?? new Set<Subscription>();
    subscribers.add(subscription);
    bus.subscribers.set(gymId, subscribers);
    return {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<GymEvent>> {
            const queued = subscription.queue.shift();
            if (queued) return Promise.resolve({ value: queued, done: false });
            return new Promise((resolve) => subscription.waiters.push(resolve));
          },
          return(): Promise<IteratorResult<GymEvent>> {
            for (const waiter of subscription.waiters) waiter({ value: undefined, done: true });
            subscription.waiters.length = 0;
            subscription.queue.length = 0;
            subscribers.delete(subscription);
            return Promise.resolve({ value: undefined, done: true });
          }
        };
      }
    };
  }
}
