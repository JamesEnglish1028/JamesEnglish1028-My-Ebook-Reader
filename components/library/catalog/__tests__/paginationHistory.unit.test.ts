import { describe, it, expect } from 'vitest';
import { pushHistory, synthesizePrev, resetHistory } from '../paginationHistory';

describe('paginationHistory helpers', () => {
  it('pushes then pops when clicking back to last url', () => {
    const current = 'https://example.com/opds/catalog';
    let hist = [] as string[];
    hist = pushHistory(hist, current, 'https://example.com/opds/catalog?page=2');
    expect(hist).toEqual([current]);

    // clicking back to current should pop
    hist = pushHistory(hist, 'https://example.com/opds/catalog?page=2', current);
    expect(hist).toEqual([]);
  });

  it('synthesizes prev when pagination prev absent', () => {
    const pagination = { next: 'n' } as any;
    const hist = ['https://example.com/opds/catalog'];
    const synth = synthesizePrev(pagination, hist);
    expect(synth.prev).toBe(hist[hist.length - 1]);
  });

  it('resetHistory returns empty array', () => {
    const hist = resetHistory();
    expect(hist).toEqual([]);
  });
});
