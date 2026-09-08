import { callHref } from '../lib/messageTemplate'
import {
  clientCallingCode,
  formatClientPhone,
} from '../lib/callingCode'

export function PhoneLink({
  phone,
  callingCode,
}: {
  phone: string
  callingCode?: string
}) {
  const client = { clientPhone: phone, clientPhoneCode: callingCode }
  const display = formatClientPhone(clientCallingCode(client), phone)

  return (
    <a href={callHref(client)} className="hover:text-blush-dark hover:underline">
      {display}
    </a>
  )
}
