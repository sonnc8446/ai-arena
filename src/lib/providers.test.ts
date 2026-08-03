import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callProvider } from './providers';

describe('providers.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws error when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(callProvider('openai', 'gpt-4', 'Hello')).rejects.toThrow(/Thiếu API key/);
  });

  it('calls openAiCompatible provider correctly', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const mockResponse = {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Mocked Response' } }] }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await callProvider('openai', 'gpt-4o', 'Hello');
    expect(result).toBe('Mocked Response');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
        body: expect.stringContaining('Hello'),
      })
    );
  });

  it('calls anthropic provider correctly', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key-anthropic';
    const mockResponse = {
      ok: true,
      json: async () => ({ content: [{ text: 'Mocked Claude Response' }] }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await callProvider('anthropic', 'claude-3', 'Hello');
    expect(result).toBe('Mocked Claude Response');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'test-key-anthropic' }),
        body: expect.stringContaining('Hello'),
      })
    );
  });

  it('calls gemini provider correctly', async () => {
    process.env.GEMINI_API_KEY = 'test-key-gemini';
    const mockResponse = {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Mocked Gemini' }] } }] }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await callProvider('gemini', 'gemini-1.5', 'Hello');
    expect(result).toBe('Mocked Gemini');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5:generateContent?key=test-key-gemini'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Hello'),
      })
    );
  });

  it('handles HTTP error correctly', async () => {
    process.env.GEMINI_API_KEY = 'test-key-gemini';
    const mockResponse = {
      ok: false,
      status: 400,
      text: async () => 'Bad Request Details',
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    await expect(callProvider('gemini', 'gemini-1.5-pro', 'Hello')).rejects.toThrow(/HTTP 400: Bad Request Details/);
  });

  it('aborts request on timeout', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    
    // Mock fetch that hangs forever
    (global.fetch as any).mockImplementation((url: string, options: RequestInit) => {
      return new Promise((resolve, reject) => {
        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            const err = new Error('AbortError');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    vi.useFakeTimers();
    
    const promise = callProvider('openai', 'gpt-4', 'Hello');
    
    // Fast forward time to trigger timeout
    vi.advanceTimersByTime(65000);
    
    await expect(promise).rejects.toThrow(/Timeout sau 60000ms/);
    
    vi.useRealTimers();
  });
});
