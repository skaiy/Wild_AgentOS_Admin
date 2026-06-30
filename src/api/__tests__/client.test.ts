/**
 * client.ts 单元测试
 * 覆盖: safeJson, parseSseFrame, ApiError, request (via fetch mock), streamTask SSE 解析
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, safeJson, parseSseFrame, type StreamHandlers } from '../client';

// ---- safeJson ----
describe('safeJson', () => {
  it('parses valid JSON object', () => {
    expect(safeJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses valid JSON array', () => {
    expect(safeJson('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns raw string on invalid JSON', () => {
    expect(safeJson('not-json')).toBe('not-json');
  });

  it('parses JSON string literal', () => {
    expect(safeJson('"hello"')).toBe('hello');
  });

  it('parses JSON number', () => {
    expect(safeJson('42')).toBe(42);
  });
});

// ---- ApiError ----
describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError('not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('carries status code', () => {
    const err = new ApiError('unauthorized', 401);
    expect(err.status).toBe(401);
    expect(err.message).toBe('unauthorized');
  });
});

// ---- parseSseFrame ----
describe('parseSseFrame', () => {
  it('parses simple data frame with default message event', () => {
    const events: Array<{ name: string; data: unknown }> = [];
    const handlers: StreamHandlers = {
      onEvent: (name, data) => events.push({ name, data }),
    };
    parseSseFrame('data: {"hello":"world"}', handlers);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('message');
    expect(events[0].data).toEqual({ hello: 'world' });
  });

  it('parses named event', () => {
    const events: Array<{ name: string; data: unknown }> = [];
    const handlers: StreamHandlers = {
      onEvent: (name, data) => events.push({ name, data }),
    };
    parseSseFrame('event: task_started\ndata: {"task_iri":"iri://x"}', handlers);
    expect(events[0].name).toBe('task_started');
    expect(events[0].data).toEqual({ task_iri: 'iri://x' });
  });

  it('joins multi-line data', () => {
    const events: Array<{ name: string; data: unknown }> = [];
    const handlers: StreamHandlers = {
      onEvent: (name, data) => events.push({ name, data }),
    };
    // SSE allows multiple data: lines → joined with \n
    parseSseFrame('data: line1\ndata: line2', handlers);
    expect(events[0].data).toBe('line1\nline2');
  });

  it('ignores empty frames (no data lines)', () => {
    const events: Array<{ name: string; data: unknown }> = [];
    const handlers: StreamHandlers = {
      onEvent: (name, data) => events.push({ name, data }),
    };
    parseSseFrame('event: ping', handlers);
    expect(events).toHaveLength(0);
  });

  it('parses raw string data', () => {
    const events: Array<{ name: string; data: unknown }> = [];
    const handlers: StreamHandlers = {
      onEvent: (name, data) => events.push({ name, data }),
    };
    parseSseFrame('data: plain text', handlers);
    expect(events[0].data).toBe('plain text');
  });
});

// ---- request() via fetch mock ----
describe('api.health via fetch mock', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // reset config so base = '' (relative, works in tests)
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'healthy', version: '0.1.0' }),
    }) as any;

    const { api } = await import('../client');
    const result = await api.health();
    expect(result.status).toBe('healthy');
    expect(result.version).toBe('0.1.0');
  });

  it('throws ApiError on non-2xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => '',
    }) as any;

    const { api } = await import('../client');
    await expect(api.health()).rejects.toBeInstanceOf(ApiError);
    await expect(api.health()).rejects.toMatchObject({ status: 503 });
  });
});

// ---- Agent CRUD + task context via fetch mock ----
describe('agent CRUD & task context', () => {
  const originalFetch = globalThis.fetch;
  let calls: Array<{ url: string; init: RequestInit }>;

  beforeEach(() => {
    localStorage.clear();
    calls = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'ok' }),
      });
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('createAgent POSTs payload to /api/v1/agents', async () => {
    const { api } = await import('../client');
    await api.createAgent({ name: '电池维修助手', skills: ['diagnose_fault'] });
    expect(calls[0].url).toContain('/api/v1/agents');
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({
      name: '电池维修助手', skills: ['diagnose_fault'],
    });
  });

  it('updateAgent PUTs to /api/v1/agents/:id', async () => {
    const { api } = await import('../client');
    await api.updateAgent('abc-123', { enabled: false });
    expect(calls[0].url).toContain('/api/v1/agents/abc-123');
    expect(calls[0].init.method).toBe('PUT');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ enabled: false });
  });

  it('deleteAgent DELETEs /api/v1/agents/:id', async () => {
    const { api } = await import('../client');
    await api.deleteAgent('abc-123');
    expect(calls[0].url).toContain('/api/v1/agents/abc-123');
    expect(calls[0].init.method).toBe('DELETE');
  });

  it('createTask carries user_id/session_id in body', async () => {
    const { api } = await import('../client');
    await api.createTask('诊断 E05 故障', 'user-1', 'sess-9');
    expect(calls[0].url).toContain('/api/v1/tasks');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      user_input: '诊断 E05 故障', user_id: 'user-1', session_id: 'sess-9',
    });
  });
});
