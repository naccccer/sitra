import { describe, expect, it } from 'vitest';
import {
  parseMatrixCsvText,
  parseMatrixImportText,
  serializeMatrixCsv,
  serializeMatrixExcelXml,
} from '../../src/modules/master-data/services/matrixImportExport';

const toComparableRows = (rows = []) => rows.map((row) => ({
  title: row.title,
  process: row.process,
  prices: row.prices,
}));

describe('matrix import/export service', () => {
  it('exports and imports CSV matrix while preserving custom thickness order', () => {
    const source = {
      thicknesses: [6, 4],
      glasses: [
        { id: 'g1', title: 'فلوت', process: 'raw', prices: { 6: 120000, 4: 100000 } },
        { id: 'g2', title: 'سوپر کلیر', process: 'sekurit', prices: { 4: 150000 } },
      ],
    };

    const csv = serializeMatrixCsv(source);
    const parsed = parseMatrixCsvText(csv);

    expect(parsed.thicknesses).toEqual([6, 4]);
    expect(toComparableRows(parsed.glasses)).toEqual([
      { title: 'فلوت', process: 'raw', prices: { 4: 100000, 6: 120000 } },
      { title: 'سوپر کلیر', process: 'sekurit', prices: { 4: 150000 } },
    ]);
  });

  it('imports CSV containing Persian digits and preserves file column order', () => {
    const csv = [
      'title,process,8,4,6',
      'فلوت,خام,"۱۸۰,۰۰۰","۱۲۰,۰۰۰","۱۵۰٬۰۰۰"',
      'سوپر کلیر,سکوریت,,200000,210000',
    ].join('\n');

    const parsed = parseMatrixImportText(csv, 'csv');

    expect(parsed.thicknesses).toEqual([8, 4, 6]);
    expect(toComparableRows(parsed.glasses)).toEqual([
      { title: 'فلوت', process: 'raw', prices: { 4: 120000, 6: 150000, 8: 180000 } },
      { title: 'سوپر کلیر', process: 'sekurit', prices: { 4: 200000, 6: 210000 } },
    ]);
  });

  it('exports and imports Excel XML matrix', () => {
    const source = {
      thicknesses: [5, 8],
      glasses: [
        { id: 'g1', title: 'فلوت', process: 'raw', prices: { 5: 180000, 8: 260000 } },
      ],
    };

    const xml = serializeMatrixExcelXml(source);
    const parsed = parseMatrixImportText(xml, 'xml');

    expect(parsed.thicknesses).toEqual([5, 8]);
    expect(toComparableRows(parsed.glasses)).toEqual([
      { title: 'فلوت', process: 'raw', prices: { 5: 180000, 8: 260000 } },
    ]);
  });

  it('rejects files without thickness columns', () => {
    expect(() => parseMatrixImportText('title,process\nفلوت,raw', 'csv')).toThrow();
  });
});
