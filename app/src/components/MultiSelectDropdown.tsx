import { useEffect, useRef, useState } from 'react'

// Checkbox-style multiselect dropdown, shared by the onboarding wizard and
// the Profile page's inline editor. Styled by `.ow-multiselect*` in
// OnboardingWizard.css (loaded globally).
export default function MultiSelectDropdown({
  options, selected, onToggle, placeholder,
}: {
  options: string[]
  selected: string[]
  onToggle: (option: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="ow-multiselect" ref={ref}>
      <div
        className="ow-multiselect-trigger"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
      >
        {selected.length === 0 ? (
          <span className="ow-multiselect-placeholder">{placeholder}</span>
        ) : (
          <div className="ow-multiselect-chips">
            {selected.map(item => (
              <span key={item} className="ow-tag-chip">
                {item}
                <button type="button" className="ow-tag-remove" onClick={e => { e.stopPropagation(); onToggle(item) }}>×</button>
              </span>
            ))}
          </div>
        )}
        <span className={`ow-multiselect-caret ${open ? 'ow-multiselect-caret-open' : ''}`}>▾</span>
      </div>

      {open && (
        <div className="ow-multiselect-panel">
          {options.map(opt => {
            const isSelected = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                className={`ow-multiselect-option ${isSelected ? 'ow-multiselect-option-selected' : ''}`}
                onClick={() => onToggle(opt)}
              >
                <span className="ow-multiselect-checkbox">{isSelected ? '✓' : ''}</span>
                {opt}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
