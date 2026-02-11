import { vi } from "vitest";

// Create a fresh mock database that can be reset between tests
const createMockDb = () => {
  let response: any[] = [];
  let executeResponse: any[] = [];

  const chainable: any = {
    select: vi.fn(() => chainable),
    from: vi.fn(() => chainable),
    where: vi.fn(() => chainable),
    limit: vi.fn(() => chainable),
    offset: vi.fn(() => chainable),
    orderBy: vi.fn(() => chainable),
    insert: vi.fn(() => chainable),
    values: vi.fn(() => chainable),
    update: vi.fn(() => chainable),
    set: vi.fn(() => chainable),
    delete: vi.fn(() => chainable),
    innerJoin: vi.fn(() => chainable),
    leftJoin: vi.fn(() => chainable),
    rightJoin: vi.fn(() => chainable),
    returning: vi.fn(() => chainable),
    onConflictDoUpdate: vi.fn(() => chainable),
    onConflictDoNothing: vi.fn(() => chainable),

    // Transaction support - executes callback with the same chainable as tx
    transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return cb(chainable);
    }),

    // execute() returns an iterable array-like result for raw SQL
    execute: vi.fn(() => {
      // Create an array that is iterable and also has rows property
      const result = executeResponse.length > 0 ? executeResponse.shift() : [];
      const iterableResult = [...result];
      Object.defineProperty(iterableResult, 'rows', { value: result });
      return Promise.resolve(iterableResult);
    }),

    // Make chainable "thenable" so it can be awaited
    then: (onfulfilled?: any, onrejected?: any) => {
      const result = response.length > 0 && Array.isArray(response[0]) ? response.shift() : response;
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },

    // Allow iteration for (const item of result)
    [Symbol.iterator]: function* () {
      const result = response.length > 0 && Array.isArray(response[0]) ? response.shift() : response;
      for (const item of result) {
        yield item;
      }
    },

    // Set what the mock should return for chainable queries
    $setResponse: (newResponse: any[]) => {
      response = newResponse;
      return chainable;
    },

    // Set responses for execute() calls (queued in order)
    $setExecuteResponse: (...responses: any[][]) => {
      executeResponse = responses;
      return chainable;
    },

    // Queue multiple responses [response1, response2] for chainable queries
    $queueResponses: (responses: any[][]) => {
      response = responses;
      return chainable;
    },

    // Reset all mocks
    $reset: () => {
      response = [];
      executeResponse = [];
      chainable.select.mockClear();
      chainable.from.mockClear();
      chainable.where.mockClear();
      chainable.limit.mockClear();
      chainable.offset.mockClear();
      chainable.orderBy.mockClear();
      chainable.insert.mockClear();
      chainable.values.mockClear();
      chainable.update.mockClear();
      chainable.set.mockClear();
      chainable.delete.mockClear();
      chainable.execute.mockClear();
      return chainable;
    }
  };

  return chainable;
};

export const mockDb = createMockDb();
export const db = mockDb;
