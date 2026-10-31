import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('reads plain rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('keeps commas, quotes and line breaks that are inside quotes', () => {
    const text = '"Find: 3, 6, 9","He said ""hi""","line one\nline two"';
    expect(parseCsv(text)).toEqual([['Find: 3, 6, 9', 'He said "hi"', 'line one\nline two']]);
  });

  it('ignores a BOM, windows line endings and empty lines', () => {
    expect(parseCsv('\uFEFFa,b\r\n\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});