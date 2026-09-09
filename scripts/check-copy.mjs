import { readFile } from 'node:fs/promises'

const checks = [
  ['index.html', ['Salon CRM', 'open the book', 'due to lapse']],
  ['src/components/LandingBrand.tsx', ['Salon CRM']],
  ['src/components/LandingFooter.tsx', ['Salon CRM', 'vhugalabudeli@gmail.com']],
  ['src/pages/Landing.tsx', ['Salon CRM', 'open the book', 'Lifespan', 'Recall SMS', 'walkthrough request', 'lead generation']],
  ['src/pages/Register.tsx', ['share the same book']],
  ['src/pages/Login.tsx', ['salon book']],
  ['src/pages/Dashboard.tsx', ['Upcoming recalls']],
  ['src/pages/Settings.tsx', ['Export my book', 'Import my book', 'salon book']],
  ['src/pages/ServiceTypes.tsx', ['Back to the book']],
  ['src/components/ImportDeviceBook.tsx', ['device’s book', 'on-device book']],
  ['src/lib/labels.ts', ['No response yet']],
  ['src/pages/Admin.tsx', ['Operator desk', 'Trial clock', 'R1 card check', 'Who should have /app', 'Entitlement vs app', 'live cards no', 'Lookup failed.', 'Repair failed.', 'CSV failed.', 'Book locked', 'Tenant JSON']],
  ['src/pages/Terms.tsx', ['Salon CRM', 'vhugalabudeli@gmail.com']],
  ['src/pages/Privacy.tsx', ['Salon CRM', 'vhugalabudeli@gmail.com']],
  ['src/pages/Refunds.tsx', ['Salon CRM', 'vhugalabudeli@gmail.com']],
]

const requiredCopy = [
  ['src/components/LandingFooter.tsx', ['support@newrecall.com']],
  ['src/pages/Terms.tsx', ['support@newrecall.com']],
  ['src/pages/Privacy.tsx', ['support@newrecall.com']],
  ['src/pages/Refunds.tsx', ['support@newrecall.com']],
]

const failures = []
for (const [file, phrases] of checks) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
  for (const phrase of phrases) {
    if (source.includes(phrase)) failures.push(`${file}: ${JSON.stringify(phrase)}`)
  }
}

for (const [file, phrases] of requiredCopy) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
  for (const phrase of phrases) {
    if (!source.includes(phrase)) failures.push(`${file}: missing ${JSON.stringify(phrase)}`)
  }
}

if (failures.length) {
  console.error(`Deprecated public copy found:\n${failures.join('\n')}`)
  process.exitCode = 1
} else {
  console.log('Public copy terminology check passed.')
}
