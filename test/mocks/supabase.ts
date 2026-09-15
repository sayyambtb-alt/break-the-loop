import { vi } from 'vitest';
import type { MissionAssignment } from '../../app/lib/missions';

export const defaultAssignment: MissionAssignment = {
  id: 'assignment-1', mode: 'solo', track: 'quest', city: 'mumbai', room_id: null,
  quest_text: 'Take a photo of the nearest tree', rarity: 'common', xp_reward: 15,
  gem: null, credit: null, accepted_at: null, proof_path: null,
};
let currentAssignment: MissionAssignment | null = null;

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
  maybeSingle() { return this.single(); }
  single() { this.method = this.method ? `${this.method}.single` : 'select.single'; return this; }

  then(onResolve: any, onReject?: any) {
    const resolver = this.state.responses[this.table];
    const fallback: MockResponse = { data: null, error: null };
    const result = typeof resolver === 'function' ? resolver(this) : resolver ?? fallback;
    return Promise.resolve(result).then(onResolve, onReject);
  }
}

export interface MockChannelHandler {
  event: string;
  config: any;
  callback: (payload: any) => void | Promise<void>;
}

export interface MockChannelEntry {
  name: string;
  channel: { _handlers: MockChannelHandler[]; [key: string]: any };
}

export interface MockState {
  session: any;
  responses: Record<string, ResponseResolver>;
  rpcResponses: Record<string, MockResponse | ((params: any) => MockResponse | Promise<MockResponse>)>;
  calls: MockCall[];
  channels: MockChannelEntry[];
  storageUploadError: any;
  authStateCallback: ((event: string, session: any) => void) | null;
}

export function createMockState(): MockState {
  return {
    session: null,
    responses: {},
    rpcResponses: {},
    calls: [],
    channels: [],
    storageUploadError: null,
    authStateCallback: null
  };
}

export const mockState: MockState = createMockState();

export function resetMockState() {
  currentAssignment = null;
  mockState.session = null;
  mockState.responses = {};
  mockState.rpcResponses = {};
  mockState.calls = [];
  mockState.channels = [];
  mockState.storageUploadError = null;
  mockState.authStateCallback = null;
}

function makeChannel() {
  const channel: any = {
    _handlers: [] as MockChannelHandler[],
    on: vi.fn((event: string, config: any, callback: (payload: any) => void | Promise<void>) => {
      channel._handlers.push({ event, config, callback });
      return channel;
    }),
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
        mockState.authStateCallback?.('SIGNED_IN', mockState.session);
        return { data: { session: mockState.session }, error: null };
      }),
      signOut: vi.fn(async () => {
        mockState.session = null;
        mockState.authStateCallback?.('SIGNED_OUT', null);
        return { error: null };
      }),
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
      if (!resolver) {
        if (name === 'ensure_profile') {
          const builder = new MockQueryBuilder('profiles', mockState);
          builder.method = 'select.single';
          const response = mockState.responses.profiles;
          return typeof response === 'function' ? response(builder) : { data: { handle: 'Tester', total_xp: 0, streak: 0, badges: [] }, error: null };
        }
        if (name === 'start_solo_mission') {
          currentAssignment = { ...defaultAssignment };
          return { data: currentAssignment, error: null };
        }
        if (name === 'accept_assignment') {
          const assigned = mockState.rpcResponses.start_solo_mission;
          if (assigned && typeof assigned !== 'function') currentAssignment = assigned.data;
          currentAssignment = { ...(currentAssignment || defaultAssignment), accepted_at: new Date().toISOString() };
          return { data: currentAssignment, error: null };
        }
        if (name === 'attach_mission_proof') {
          currentAssignment = { ...(currentAssignment || defaultAssignment), proof_path: params.p_photo_path };
          return { data: currentAssignment, error: null };
        }
        return { data: null, error: null };
      }
      return typeof resolver === 'function' ? resolver(params) : resolver;
    }),
    channel: vi.fn((name: string) => {
      const channel = makeChannel();
      mockState.channels.push({ name, channel });
      return channel;
    }),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn(async (path: string, blob: any, opts: any) => {
          mockState.calls.push({ type: 'storage-upload', method: 'upload', args: [bucket, path, opts] });
          if (mockState.storageUploadError) return { data: null, error: mockState.storageUploadError };
          return { data: { path }, error: null };
        }),
        createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `https://example.test/signed/${path}` }, error: null })),
        remove: vi.fn(async () => ({ data: [], error: null })),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://vopavevysovvucmhkvkr.supabase.co/storage/v1/object/public/${bucket}/${path}` }
        }))
      }))
    }
  };
}
