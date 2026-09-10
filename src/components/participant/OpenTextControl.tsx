type OpenTextControlProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function OpenTextControl({
  value,
  onChange,
  placeholder = 'Type your answer…',
}: OpenTextControlProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={5}
      placeholder={placeholder}
      className="min-h-[140px] w-full resize-y rounded-2xl border border-sand bg-white/80 px-4 py-3.5 text-base leading-relaxed text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
    />
  )
}
