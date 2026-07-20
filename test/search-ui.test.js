import { describe, it, expect } from 'vitest';
import {
  groupResultsByFolder,
  formatSearchStats,
} from '../services/search-ui.js';

function row(path) {
  return { it: { sub: path }, score: 1 };
}

describe('groupResultsByFolder', () => {
  it('groups ranked rows by parent folder preserving order', () => {
    const ranked = [
      row('notes/a.md'),
      row('journal/2024.md'),
      row('notes/b.md'),
      row('journal/2025.md'),
    ];
    const groups = groupResultsByFolder(ranked);
    expect(groups).toHaveLength(2);
    expect(groups[0].folder).toBe('notes');
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[1].folder).toBe('journal');
    expect(groups[1].rows).toHaveLength(2);
  });

  it('puts vault-root notes in empty folder key', () => {
    const groups = groupResultsByFolder([row('readme.md')]);
    expect(groups[0].folder).toBe('');
    expect(groups[0].rows).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(groupResultsByFolder([])).toEqual([]);
    expect(groupResultsByFolder(null)).toEqual([]);
  });
});

describe('formatSearchStats', () => {
  it('formats result count, vault notes, and elapsed ms', () => {
    const ranked = [row('a.md'), row('b.md')];
    expect(formatSearchStats(ranked, 847, 12, null)).toBe('2 results in 847 notes · 12 ms');
  });

  it('reads elapsedMs from diagnostics when not passed directly', () => {
    const ranked = [row('a.md')];
    expect(formatSearchStats(ranked, 100, null, { elapsedMs: 9 })).toBe(
      '1 results in 100 notes · 9 ms'
    );
  });

  it('omits ms segment when timing is unavailable', () => {
    expect(formatSearchStats([], 50, null, null)).toBe('0 results in 50 notes');
  });
});
