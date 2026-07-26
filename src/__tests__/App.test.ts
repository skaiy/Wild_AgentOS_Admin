import { describe, expect, it } from 'vitest';
import { findPageByQuery } from '../App';

describe('findPageByQuery', () => {
  it('matches Chinese navigation keywords', () => {
    expect(findPageByQuery('智能体')).toBe('agents');
    expect(findPageByQuery('任务')).toBe('console');
    expect(findPageByQuery('日志')).toBe('runtime');
  });

  it('matches English keywords case-insensitively', () => {
    expect(findPageByQuery('SKILL')).toBe('registry');
  });

  it('returns undefined for blank or unknown queries', () => {
    expect(findPageByQuery('')).toBeUndefined();
    expect(findPageByQuery('不存在的页面')).toBeUndefined();
  });
});
