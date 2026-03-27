import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()

const checks = [
  {
    file: 'src/components/layout/Sidebar.jsx',
    requiredSnippets: [
      '\u0639\u0645\u0644\u06cc\u0627\u062a \u0631\u0648\u0632\u0627\u0646\u0647',
      '\u0645\u062f\u06cc\u0631\u06cc\u062a \u0633\u06cc\u0633\u062a\u0645',
      '\u062a\u0646\u0638\u06cc\u0645\u0627\u062a',
    ],
  },
  {
    file: 'src/components/layout/Header.jsx',
    requiredSnippets: [
      '\u062f\u0627\u0634\u0628\u0648\u0631\u062f',
      '\u062a\u0646\u0638\u06cc\u0645\u0627\u062a',
      '\u062e\u0631\u0648\u062c',
    ],
  },
  {
    file: 'src/kernel/pages/SettingsPage.jsx',
    requiredSnippets: [
      '\u062a\u0646\u0638\u06cc\u0645\u0627\u062a',
      '\u0645\u062f\u06cc\u0631\u06cc\u062a \u0642\u06cc\u0645\u062a\u200c\u0647\u0627',
      '\u0645\u0645\u06cc\u0632\u06cc \u0641\u0639\u0627\u0644\u06cc\u062a\u200c\u0647\u0627',
      '\u062f\u0633\u062a\u0631\u0633\u06cc \u06a9\u0627\u0641\u06cc \u0628\u0631\u0627\u06cc \u0628\u062e\u0634 \u0645\u062f\u06cc\u0631\u06cc\u062a \u0648\u062c\u0648\u062f \u0646\u062f\u0627\u0631\u062f',
    ],
  },
  {
    file: 'src/kernel/pages/AuditLogsPage.jsx',
    requiredSnippets: [
      '\u0645\u0645\u06cc\u0632\u06cc \u0641\u0639\u0627\u0644\u06cc\u062a \u0647\u0627',
      '\u0647\u0645\u0647 \u0631\u0648\u06cc\u062f\u0627\u062f\u0647\u0627',
      '\u0627\u0632 \u062a\u0627\u0631\u06cc\u062e \u0648 \u0633\u0627\u0639\u062a',
      '\u062a\u0627 \u062a\u0627\u0631\u06cc\u062e \u0648 \u0633\u0627\u0639\u062a',
    ],
    forbiddenSnippets: [' (${eventType})', ` (' + eventType + ')'`, ' + eventType + '],
  },
]

const mojibakePattern = /(Ã.|Ø.|Ù.)/u
const persianTextPattern = /[\u0600-\u06ff]/u
const failures = []

for (const item of checks) {
  const absolutePath = path.join(ROOT, item.file)

  if (!fs.existsSync(absolutePath)) {
    failures.push(`${item.file}: file not found`)
    continue
  }

  const content = fs.readFileSync(absolutePath, 'utf8')

  for (const snippet of item.requiredSnippets || []) {
    if (!content.includes(snippet)) {
      failures.push(`${item.file}: missing required Persian snippet "${snippet}"`)
    }
  }

  if (!persianTextPattern.test(content)) {
    failures.push(`${item.file}: no Persian text detected`)
  }

  if (mojibakePattern.test(content)) {
    failures.push(`${item.file}: possible mojibake detected`)
  }

  for (const snippet of item.forbiddenSnippets || []) {
    if (content.includes(snippet)) {
      failures.push(`${item.file}: forbidden snippet detected "${snippet}"`)
    }
  }
}

if (failures.length > 0) {
  console.error('UI Persian check failed.')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('UI Persian check passed.')
