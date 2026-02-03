import { mock } from "bun:test";

// Create a fresh mock database that can be reset between tests
const createMockDb = () => {
  let response: any[] = [];

  const chainable: any = {
    select: mock(() => chainable),
    from: mock(() => chainable),
    where: mock(() => chainable),
    limit: mock(() => chainable),
    offset: mock(() => chainable),
    orderBy: mock(() => chainable),
    insert: mock(() => chainable),
    values: mock(() => chainable),
    update: mock(() => chainable),
    set: mock(() => chainable),
    delete: mock(() => chainable),
    innerJoin: mock(() => chainable),
    leftJoin: mock(() => chainable),
    rightJoin: mock(() => chainable),
    returning: mock(() => chainable),
    onConflictDoUpdate: mock(() => chainable),
    execute: mock(() => Promise.resolve({ rows: [] })),

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

    // Set what the mock should return
    $setResponse: (newResponse: any[]) => {
      response = newResponse;
      return chainable;
    },

    // Queue multiple responses [response1, response2]
    $queueResponses: (responses: any[][]) => {
      response = responses;
      return chainable;
    },

    // Reset all mocks
    $reset: () => {
      response = [];
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
      return chainable;
    }
  };

  return chainable;
};

export const mockDb = createMockDb();
export const db = mockDb;
