const CP1252_EXTENDED_MAP = {
  0x20AC: 0x80,
  0x201A: 0x82,
  0x0192: 0x83,
  0x201E: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02C6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8A,
  0x2039: 0x8B,
  0x0152: 0x8C,
  0x017D: 0x8E,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201C: 0x93,
  0x201D: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02DC: 0x98,
  0x2122: 0x99,
  0x0161: 0x9A,
  0x203A: 0x9B,
  0x0153: 0x9C,
  0x017E: 0x9E,
  0x0178: 0x9F,
}

const MOJIBAKE_HINT_REGEX = /[\u00D8\u00D9\u00DA\u00DB\u00C3\u00C2\u00E2][^a-zA-Z]*|\u00E2\u20AC|\u00D0|\u00D1/
const PERSIAN_ARABIC_REGEX = /[\u0600-\u06FF]/
const MOJIBAKE_CHARS_REGEX = /[\u00D8\u00D9\u00DA\u00DB\u00C3\u00C2\u00E2\u00D0\u00D1]/g
const HARD_MOJIBAKE_REGEX = /[\u251C\u2500-\u257F\u00AC\u00BA\u00C7\u00D4\u00FF\u00FC\u00F8\u00BC]|(?:\u00D4\u00C7)|(?:\u2500?\u252C)/

const toWindows1252Bytes = (input) => {
  const bytes = []
  for (const ch of String(input || '')) {
    const code = ch.codePointAt(0)
    if (typeof code !== 'number') return null
    if (code <= 0xFF) {
      bytes.push(code)
      continue
    }
    const mapped = CP1252_EXTENDED_MAP[code]
    if (typeof mapped === 'number') {
      bytes.push(mapped)
      continue
    }
    return null
  }
  return new Uint8Array(bytes)
}

const countMojibakeChars = (value) => (String(value || '').match(MOJIBAKE_CHARS_REGEX) || []).length

export const fixPossibleMojibake = (value) => {
  const raw = String(value ?? '').trim()
  if (raw === '') return ''
  if (!MOJIBAKE_HINT_REGEX.test(raw)) return raw

  const bytes = toWindows1252Bytes(raw)
  if (!bytes || bytes.length === 0) return raw

  let decoded = raw
  try {
    decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim()
  } catch {
    return raw
  }

  if (decoded === '' || decoded.includes('\uFFFD')) return raw
  if (!PERSIAN_ARABIC_REGEX.test(decoded)) return raw
  if (countMojibakeChars(decoded) >= countMojibakeChars(raw)) return raw
  return decoded
}

export const isLikelyMojibakeText = (value) => {
  const raw = String(value ?? '').trim()
  if (raw === '') return false
  if (HARD_MOJIBAKE_REGEX.test(raw)) return true
  return MOJIBAKE_HINT_REGEX.test(raw) && !PERSIAN_ARABIC_REGEX.test(raw)
}
