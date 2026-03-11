import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const SCHEMA_DIR = path.join(ROOT, 'contracts', 'schemas')
const OUTPUT_FILE = path.join(ROOT, 'src', 'types', 'api-contracts.generated.js')

function pascalCase(input) {
  return String(input)
    .replace(/\.schema\.json$/i, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')
}

function propertyKey(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : `'${name}'`
}

function schemaToType(schema) {
  if (!schema || typeof schema !== 'object') return 'any'

  if (schema.$ref) return 'any'

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum.map((value) => JSON.stringify(value)).join(' | ')
  }

  if (Array.isArray(schema.type)) {
    return schema.type.map((value) => schemaToType({ ...schema, type: value })).join(' | ')
  }

  const type = schema.type
  if (type === 'string') return 'string'
  if (type === 'integer' || type === 'number') return 'number'
  if (type === 'boolean') return 'boolean'
  if (type === 'null') return 'null'

  if (type === 'array') {
    return `Array<${schemaToType(schema.items || { type: 'any' })}>`
  }

  if (type === 'object' || schema.properties) {
    const properties = schema.properties || {}
    const required = new Set(Array.isArray(schema.required) ? schema.required : [])
    const entries = Object.entries(properties)

    if (entries.length === 0) {
      return 'Record<string, any>'
    }

    const fields = entries.map(([key, value]) => {
      const optional = required.has(key) ? '' : '?'
      return `${propertyKey(key)}${optional}: ${schemaToType(value)}`
    })

    return `{ ${fields.join(', ')} }`
  }

  return 'any'
}

if (!fs.existsSync(SCHEMA_DIR)) {
  console.error(`Schema directory not found: ${SCHEMA_DIR}`)
  process.exit(1)
}

const schemaFiles = fs.readdirSync(SCHEMA_DIR)
  .filter((fileName) => fileName.endsWith('.json'))
  .sort((a, b) => a.localeCompare(b))

if (schemaFiles.length === 0) {
  console.error('No schema files found to generate types from.')
  process.exit(1)
}

const typedefBlocks = []
for (const fileName of schemaFiles) {
  const fullPath = path.join(SCHEMA_DIR, fileName)
  const schemaText = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '')
  const schema = JSON.parse(schemaText)
  const typeName = String(schema.title || pascalCase(fileName)).replace(/[^A-Za-z0-9_]/g, '')
  const jsdocType = schemaToType(schema)

  typedefBlocks.push(`/**\n * @typedef ${jsdocType} ${typeName}\n */`)
  typedefBlocks.push(`export const __type_${typeName} = null`)
}

const output = [
  '// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.',
  '// Run `npm run contracts:types` after modifying contracts/schemas/*.json.',
  '',
  ...typedefBlocks,
  '',
].join('\n')

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
fs.writeFileSync(OUTPUT_FILE, output, 'utf8')
console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)} from ${schemaFiles.length} schema file(s).`)
