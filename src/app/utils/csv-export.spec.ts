import { buildCsv } from '@app/utils/csv-export';

describe('buildCsv', () => {
  it('quotes cells and escapes embedded quotes', () => {
    const csv = buildCsv(['ID', 'Title'], [[1, 'Say "hi", please']]);
    expect(csv).toBe('"ID","Title"\r\n"1","Say ""hi"", please"');
  });
});
