import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildHumanResourcesSampleWorkbook, parseHumanResourcesImportFile } from '../../src/modules/human-resources/utils/humanResourcesImport'

const toSampleFile = (workbook) => new File(
  [XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })],
  'human-resources-sample.xlsx',
  { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
)

describe('human resources import', () => {
  it('parses the downloaded sample workbook without errors', async () => {
    const workbook = buildHumanResourcesSampleWorkbook()
    const result = await parseHumanResourcesImportFile(toSampleFile(workbook), [])

    expect(result.summary.total).toBe(1)
    expect(result.summary.valid).toBe(1)
    expect(result.summary.errors).toBe(0)
    expect(result.unknownHeaders).toEqual([])
    expect(result.rows[0].errors).toEqual([])
    expect(result.rows[0].values.firstName).not.toBe('')
    expect(result.rows[0].values.lastName).not.toBe('')
    expect(result.rows[0].values.nationalId).toBe('1234567890')
  })
})
