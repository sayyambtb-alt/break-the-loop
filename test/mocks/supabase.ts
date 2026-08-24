import { vi } from 'vitest';

export type MockResponse = { data: any; error: any };
export type ResponseResolver = MockResponse | ((builder: MockQueryBuilder) => MockResponse);

export interface MockCall {
  table?: string;
  type: 'query' | 'rpc' | 'storage-upload';
  method: string;
  args: any[];
  filters?: [string, any][];
}

export class MockQueryBuilder {
  table: string;
  state: MockState;
  method = '';
  filters: [string, any][] = [];
  args: any[] = [];

  constructor(table: string, state: MockState) {
    this.table = table;
    this.state = state;
  }

  private record(method: string, args: any[]) {
    this.method = method;
    this.args = args;
    this.state.calls.push({ table: this.table, type: 'query', method, args, filters: this.filters });
    return this;
  }

  select(...args: any[]) { return this.record('select', args); }
  insert(...args: any[]) { return this.record('insert', args); }
  update(...args: any[]) { return this.record('update', args); }
  upsert(...args: any[]) { return this.record('upsert', args); }
  delete(...args: any[]) { return this.record('delete', args); }
  eq(col: string, val: any) { this.filters.push([col, val]); return this; }
  or(...args: any[]) { this.args.push(args); return this; }
  in(col: string, vals: any) { this.filters.push([col, vals]); return this; }
  order(...args: any[]) { return this; }
  limit(...args: any[]) { return this; }
  single() { this.method = this.method ? `${this.method}.single` : 'select.single'; return this; }

  then(onResolve: any, onReject?: any) {
    const resolver = this.state.responses[this.table];
    const fallback: MockResponse = { data: null, error: null };
    const result = typeof resolver === 'function' ? resolver(this) : resolver ?? fallback;
    return Promise.resolve(result).then(onResolve, onReject);
  }
}

export interface MockState {
  session: any;
  responses: Record<string, ResponseResolver>;
  rpcResponses: Record<string, MockResponse | ((params: any) => MockResponse)>;
  calls: MockCall[];
  storageUploadError: any;
  authStateCallback: ((event: string, session: any) => void) | null;
}

export function createMockState(): MockState {
  return {
    session: null,
    responses: {},
    rpcResponses: {},
    calls: [],
    storageUploadError: null,
    authStateCallback: null
  };
}

export const mockState: MockState = createMockState();

export function resetMockState() {
  mockState.session = null;
  mockState.responses = {};
  mockState.rpcResponses = {};
  mockState.calls = [];
  mockState.storageUploadError = null;
  mockState.authStateCallback = null;
}

function makeChannel() {
  const channel: any = {
    on: vi.fn(() => channel),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      cb?.('SUBSCRIBED');
      return channel;
    }),
    track: vi.fn(async () => ({ status: 'ok' })),
    untrack: vi.fn(async () => ({ status: 'ok' })),
    presenceState: vi.fn(() => ({}))
  };
  return channel;
}

export function buildSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: mockState.session }, error: null })),
      signInAnonymously: vi.fn(async () => {
        mockState.session = mockState.session ?? {
          user: { id: 'anon-user-id', email: undefined },
          access_token: 'fake-anon-token'
        };
        return { data: { session: mockState.session }, error: null };
      }),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithOtp: vi.fn(async (params: any) => {
        mockState.calls.push({ type: 'rpc', method: 'signInWithOtp', args: [params] });
        const resolver = mockState.rpcResponses['signInWithOtp'];
        const result = typeof resolver === 'function' ? resolver(params) : resolver ?? { data: {}, error: null };
        return result;
      }),
      verifyOtp: vi.fn(async (params: any) => {
        mockState.calls.push({ type: 'rpc', method: 'verifyOtp', args: [params] });
        const resolver = mockState.rpcResponses['verifyOtp'];
        const result = typeof resolver === 'function' ? resolver(params) : resolver ?? { data: {}, error: null };
        return result;
      }),
      updateUser: vi.fn(async (params: any) => {
        mockState.calls.push({ type: 'rpc', method: 'updateUser', args: [params] });
        const resolver = mockState.rpcResponses['updateUser'];
        const result = typeof resolver === 'function' ? resolver(params) : resolver ?? { data: {}, error: null };
        return result;
      }),
      onAuthStateChange: vi.fn((cb: (event: string, session: any) => void) => {
        mockState.authStateCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      })
    },
    from: (table: string) => new MockQueryBuilder(table, mockState),
    rpc: vi.fn(async (name: string, params?: any) => {
      mockState.calls.push({ type: 'rpc', method: name, args: [params] });
      const resolver = mockState.rpcResponses[name];
      if (!resolver) return { data: null, error: null };
      return typeof resolver === 'function' ? resolver(params) : resolver;
    }),
    channel: vi.fn(() => makeChannel()),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn(async (path: string, blob: any, opts: any) => {
          mockState.calls.push({ type: 'storage-upload', method: 'upload', args: [bucket, path, opts] });
          if (mockState.storageUploadError) return { data: null, error: mockState.storageUploadError };
          return { data: { path }, error: null };
        }),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://vopavevysovvucmhkvkr.supabase.co/storage/v1/object/public/${bucket}/${path}` }
        }))
      }))
    }
  };
}
