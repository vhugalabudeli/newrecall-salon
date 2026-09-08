export function Switch({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className="flex h-11 w-14 shrink-0 items-center justify-center"
    >
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${
          checked ? 'bg-blush' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 block h-6 w-6 rounded-full bg-ivory transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}
