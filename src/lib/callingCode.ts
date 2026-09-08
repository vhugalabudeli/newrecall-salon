export type CallingCodeEntry = {
  /** ITU country calling code, digits only (e.g. "27"). */
  code: string
  name: string
  regions: readonly string[]
}

/** Common calling codes, Africa-first then the rest of the world. */
export const CALLING_CODES: readonly CallingCodeEntry[] = [
  { code: '27', name: 'South Africa', regions: ['ZA'] },
  { code: '266', name: 'Lesotho', regions: ['LS'] },
  { code: '268', name: 'Eswatini', regions: ['SZ'] },
  { code: '267', name: 'Botswana', regions: ['BW'] },
  { code: '264', name: 'Namibia', regions: ['NA'] },
  { code: '263', name: 'Zimbabwe', regions: ['ZW'] },
  { code: '258', name: 'Mozambique', regions: ['MZ'] },
  { code: '260', name: 'Zambia', regions: ['ZM'] },
  { code: '265', name: 'Malawi', regions: ['MW'] },
  { code: '244', name: 'Angola', regions: ['AO'] },
  { code: '234', name: 'Nigeria', regions: ['NG'] },
  { code: '233', name: 'Ghana', regions: ['GH'] },
  { code: '254', name: 'Kenya', regions: ['KE'] },
  { code: '256', name: 'Uganda', regions: ['UG'] },
  { code: '255', name: 'Tanzania', regions: ['TZ'] },
  { code: '250', name: 'Rwanda', regions: ['RW'] },
  { code: '257', name: 'Burundi', regions: ['BI'] },
  { code: '251', name: 'Ethiopia', regions: ['ET'] },
  { code: '20', name: 'Egypt', regions: ['EG'] },
  { code: '212', name: 'Morocco', regions: ['MA'] },
  { code: '213', name: 'Algeria', regions: ['DZ'] },
  { code: '216', name: 'Tunisia', regions: ['TN'] },
  { code: '218', name: 'Libya', regions: ['LY'] },
  { code: '221', name: 'Senegal', regions: ['SN'] },
  { code: '225', name: "Côte d'Ivoire", regions: ['CI'] },
  { code: '237', name: 'Cameroon', regions: ['CM'] },
  { code: '243', name: 'DR Congo', regions: ['CD'] },
  { code: '242', name: 'Congo', regions: ['CG'] },
  { code: '241', name: 'Gabon', regions: ['GA'] },
  { code: '230', name: 'Mauritius', regions: ['MU'] },
  { code: '261', name: 'Madagascar', regions: ['MG'] },
  { code: '1', name: 'United States / Canada', regions: ['US', 'CA'] },
  { code: '52', name: 'Mexico', regions: ['MX'] },
  { code: '55', name: 'Brazil', regions: ['BR'] },
  { code: '54', name: 'Argentina', regions: ['AR'] },
  { code: '56', name: 'Chile', regions: ['CL'] },
  { code: '57', name: 'Colombia', regions: ['CO'] },
  { code: '51', name: 'Peru', regions: ['PE'] },
  { code: '44', name: 'United Kingdom', regions: ['GB'] },
  { code: '353', name: 'Ireland', regions: ['IE'] },
  { code: '33', name: 'France', regions: ['FR'] },
  { code: '49', name: 'Germany', regions: ['DE'] },
  { code: '31', name: 'Netherlands', regions: ['NL'] },
  { code: '32', name: 'Belgium', regions: ['BE'] },
  { code: '34', name: 'Spain', regions: ['ES'] },
  { code: '351', name: 'Portugal', regions: ['PT'] },
  { code: '39', name: 'Italy', regions: ['IT'] },
  { code: '41', name: 'Switzerland', regions: ['CH'] },
  { code: '43', name: 'Austria', regions: ['AT'] },
  { code: '46', name: 'Sweden', regions: ['SE'] },
  { code: '47', name: 'Norway', regions: ['NO'] },
  { code: '45', name: 'Denmark', regions: ['DK'] },
  { code: '358', name: 'Finland', regions: ['FI'] },
  { code: '48', name: 'Poland', regions: ['PL'] },
  { code: '30', name: 'Greece', regions: ['GR'] },
  { code: '90', name: 'Turkey', regions: ['TR'] },
  { code: '7', name: 'Russia / Kazakhstan', regions: ['RU', 'KZ'] },
  { code: '380', name: 'Ukraine', regions: ['UA'] },
  { code: '61', name: 'Australia', regions: ['AU'] },
  { code: '64', name: 'New Zealand', regions: ['NZ'] },
  { code: '91', name: 'India', regions: ['IN'] },
  { code: '92', name: 'Pakistan', regions: ['PK'] },
  { code: '880', name: 'Bangladesh', regions: ['BD'] },
  { code: '94', name: 'Sri Lanka', regions: ['LK'] },
  { code: '86', name: 'China', regions: ['CN'] },
  { code: '852', name: 'Hong Kong', regions: ['HK'] },
  { code: '853', name: 'Macao', regions: ['MO'] },
  { code: '886', name: 'Taiwan', regions: ['TW'] },
  { code: '81', name: 'Japan', regions: ['JP'] },
  { code: '82', name: 'South Korea', regions: ['KR'] },
  { code: '65', name: 'Singapore', regions: ['SG'] },
  { code: '60', name: 'Malaysia', regions: ['MY'] },
  { code: '66', name: 'Thailand', regions: ['TH'] },
  { code: '84', name: 'Vietnam', regions: ['VN'] },
  { code: '63', name: 'Philippines', regions: ['PH'] },
  { code: '62', name: 'Indonesia', regions: ['ID'] },
  { code: '971', name: 'United Arab Emirates', regions: ['AE'] },
  { code: '966', name: 'Saudi Arabia', regions: ['SA'] },
  { code: '974', name: 'Qatar', regions: ['QA'] },
  { code: '965', name: 'Kuwait', regions: ['KW'] },
  { code: '973', name: 'Bahrain', regions: ['BH'] },
  { code: '968', name: 'Oman', regions: ['OM'] },
  { code: '972', name: 'Israel', regions: ['IL'] },
  { code: '962', name: 'Jordan', regions: ['JO'] },
  { code: '961', name: 'Lebanon', regions: ['LB'] },
  { code: '98', name: 'Iran', regions: ['IR'] },
  { code: '93', name: 'Afghanistan', regions: ['AF'] },
]

const TZ_TO_REGION: Record<string, string> = {
  'Africa/Johannesburg': 'ZA',
  'Africa/Maseru': 'LS',
  'Africa/Mbabane': 'SZ',
  'Africa/Gaborone': 'BW',
  'Africa/Windhoek': 'NA',
  'Africa/Harare': 'ZW',
  'Africa/Maputo': 'MZ',
  'Africa/Lusaka': 'ZM',
  'Africa/Blantyre': 'MW',
  'Africa/Luanda': 'AO',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Nairobi': 'KE',
  'Africa/Kampala': 'UG',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kigali': 'RW',
  'Africa/Addis_Ababa': 'ET',
  'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Tripoli': 'LY',
  'Africa/Dakar': 'SN',
  'Africa/Abidjan': 'CI',
  'Africa/Douala': 'CM',
  'Africa/Kinshasa': 'CD',
  'Africa/Lubumbashi': 'CD',
  'Africa/Brazzaville': 'CG',
  'Africa/Libreville': 'GA',
  'Indian/Mauritius': 'MU',
  'Indian/Antananarivo': 'MG',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Madrid': 'ES',
  'Europe/Lisbon': 'PT',
  'Europe/Rome': 'IT',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Warsaw': 'PL',
  'Europe/Athens': 'GR',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'Europe/Kyiv': 'UA',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',
  'Asia/Kolkata': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Manila': 'PH',
  'Asia/Jakarta': 'ID',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Jerusalem': 'IL',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Tehran': 'IR',
  'Asia/Kabul': 'AF',
}

const FALLBACK_CALLING_CODE = '27'

function codeForRegion(region: string): string | undefined {
  const upper = region.toUpperCase()
  return CALLING_CODES.find((entry) => entry.regions.includes(upper))?.code
}

/** Explicit region from the language tag only — do not maximize (en → US). */
function regionFromLocales(): string {
  if (typeof navigator === 'undefined') return ''
  const tags = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean)

  for (const tag of tags) {
    try {
      const region = new Intl.Locale(tag).region
      if (region) return region.toUpperCase()
    } catch {
      const match = tag.match(/-([A-Za-z]{2})\b/)
      if (match?.[1]) return match[1].toUpperCase()
    }
  }
  return ''
}

function regionFromTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && TZ_TO_REGION[tz]) return TZ_TO_REGION[tz]
  } catch {
    /* ignore */
  }
  return ''
}

export function deviceCallingCode(): string {
  const fromLocale = regionFromLocales()
  const localeCode = fromLocale ? codeForRegion(fromLocale) : undefined
  if (localeCode) return localeCode

  const fromTz = regionFromTimeZone()
  const tzCode = fromTz ? codeForRegion(fromTz) : undefined
  if (tzCode) return tzCode

  return FALLBACK_CALLING_CODE
}

function codesLongestFirst(): string[] {
  return CALLING_CODES.map((entry) => entry.code).sort(
    (a, b) => b.length - a.length,
  )
}

function matchCallingCodePrefix(digits: string): string | undefined {
  return codesLongestFirst().find((code) => digits.startsWith(code))
}

/** Guess a calling code for records saved before this field existed. */
export function inferCallingCode(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return matchCallingCodePrefix(digits) ?? deviceCallingCode()
  }

  let digits = trimmed.replace(/\D/g, '')
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
    return matchCallingCodePrefix(digits) ?? deviceCallingCode()
  }

  if (digits.startsWith('0')) return FALLBACK_CALLING_CODE
  return deviceCallingCode()
}

export function clientCallingCode(client: {
  clientPhone: string
  clientPhoneCode?: string
}): string {
  const stored = client.clientPhoneCode?.replace(/\D/g, '')
  if (stored) return stored
  return inferCallingCode(client.clientPhone)
}

/** International digits with no + or separators, for tel / sms / wa.me. */
export function internationalDigits(
  callingCode: string,
  phone: string,
): string {
  const cc = callingCode.replace(/\D/g, '')
  const trimmed = phone.trim()

  if (trimmed.startsWith('+')) {
    return trimmed.slice(1).replace(/\D/g, '')
  }

  let digits = trimmed.replace(/\D/g, '')
  if (digits.startsWith('00')) {
    return digits.slice(2)
  }
  if (cc && digits.startsWith(cc)) {
    return digits
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  return `${cc}${digits}`
}

function groupNationalNumber(digits: string): string {
  if (digits.length === 9) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return digits
}

export function formatClientPhone(callingCode: string, phone: string): string {
  const cc = callingCode.replace(/\D/g, '')
  const trimmed = phone.trim()
  if (!trimmed) return cc ? `+${cc}` : ''

  const intl = internationalDigits(callingCode, trimmed)
  let national = intl
  if (cc && national.startsWith(cc)) {
    national = national.slice(cc.length)
  }
  if (national.startsWith('0')) {
    national = national.slice(1)
  }
  if (!national) return cc ? `+${cc}` : ''

  return `+${cc} ${groupNationalNumber(national)}`
}

export type CallingCodeOption = {
  value: string
  label: string
  triggerLabel: string
}

export function callingCodeOptions(
  preferred: string,
  current?: string,
): CallingCodeOption[] {
  const preferredCode = preferred.replace(/\D/g, '')
  const currentCode = current?.replace(/\D/g, '')

  const toOption = (entry: CallingCodeEntry): CallingCodeOption => ({
    value: entry.code,
    label: `+${entry.code}  ${entry.name}`,
    triggerLabel: `+${entry.code}`,
  })

  const preferredEntries = CALLING_CODES.filter(
    (entry) => entry.code === preferredCode,
  )
  const rest = CALLING_CODES.filter((entry) => entry.code !== preferredCode)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  const options = [...preferredEntries, ...rest].map(toOption)

  if (
    currentCode &&
    !options.some((option) => option.value === currentCode)
  ) {
    options.unshift({
      value: currentCode,
      label: `+${currentCode}`,
      triggerLabel: `+${currentCode}`,
    })
  }

  return options
}
