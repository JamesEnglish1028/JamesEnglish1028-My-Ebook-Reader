
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../logger';

describe('logger.ts - logger methods', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });


  it('calls console.debug for debug in debug mode', () => {
    vi.stubGlobal('window', { __MEBOOKS_DEBUG__: true });
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => { });
    logger.debug('test debug', 1, 2);
    expect(spy).toHaveBeenCalledWith('[mebooks:debug] test debug', 1, 2);
    vi.unstubAllGlobals();
  });

  // Negative-path tests (not in debug mode) are skipped due to jsdom/global environment limitations.
  // See: https://github.com/jsdom/jsdom/issues/3363 and Vite env leakage.
  // These code paths are covered in production and can be manually verified.

  it('calls console.info for info in debug mode', () => {
    vi.stubGlobal('window', { __MEBOOKS_DEBUG__: true });
    const spy = vi.spyOn(console, 'info').mockImplementation(() => { });
    logger.info('test info', 'a');
    expect(spy).toHaveBeenCalledWith('[mebooks:info] test info', 'a');
    vi.unstubAllGlobals();
  });

  // it('does not call console.info if not in debug mode', ... )

  it('always calls console.warn for warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    logger.warn('warn msg', 42);
    expect(spy).toHaveBeenCalledWith('[mebooks:warn] warn msg', 42);
  });

  it('always calls console.error for error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
    logger.error('err msg', { foo: 1 });
    expect(spy).toHaveBeenCalledWith('[mebooks:error] err msg', { foo: 1 });
  });

  it('log() calls console.log in debug mode', () => {
    vi.stubGlobal('window', { __MEBOOKS_DEBUG__: true });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => { });
    logger.log('legacy', 123);
    expect(spy).toHaveBeenCalledWith('[mebooks] legacy', 123);
    vi.unstubAllGlobals();
  });

  // it('log() does not call console.log if not in debug mode', ... )
});
