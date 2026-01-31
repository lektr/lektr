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
      return Promise.resolve(response).then(onfulfilled, onrejected);
    },
    
    // Allow iteration for (const item of result)
    [Symbol.iterator]: function* () {
      for (const item of response) {
        yield item;
      }
    },
    
    // Set what the mock should return
    $setResponse: (newResponse: any[]) => {
      response = newResponse;
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
