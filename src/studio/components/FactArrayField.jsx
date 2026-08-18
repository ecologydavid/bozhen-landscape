import { useId, useRef } from 'react'

export default function FactArrayField({ field, rows, error, onChange, createRow }) {
  const fieldId = useId()
  const inputRefs = useRef(new Map())
  const errorId = `${fieldId}-error`

  function updateRow(rowId, value) {
    onChange(rows.map((row) => row.id === rowId ? { ...row, value } : row))
  }

  function removeRow(index) {
    const focusRow = rows[index + 1] || rows[index - 1]
    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
    queueMicrotask(() => inputRefs.current.get(focusRow?.id)?.focus())
  }

  return (
    <fieldset
      className="studio-array-field"
      aria-describedby={error ? errorId : undefined}
    >
      <legend>{field.label}</legend>
      <div className="studio-array-rows">
        {rows.map((row, index) => {
          const inputId = `${fieldId}-${row.id}`
          const itemInvalid = Boolean(error) && (
            error.itemIndexes.length === 0 ? index === 0 : error.itemIndexes.includes(index)
          )

          return (
            <div className="studio-array-row" key={row.id}>
              <label className="studio-visually-hidden" htmlFor={inputId}>
                {field.label} {index + 1}
              </label>
              <input
                id={inputId}
                ref={(node) => {
                  if (node) inputRefs.current.set(row.id, node)
                  else inputRefs.current.delete(row.id)
                }}
                value={row.value}
                aria-invalid={itemInvalid || undefined}
                aria-describedby={itemInvalid ? errorId : undefined}
                onChange={(event) => updateRow(row.id, event.target.value)}
              />
              {rows.length > 1 ? (
                <button
                  className="studio-remove-button"
                  type="button"
                  aria-label={`移除${field.label} ${index + 1}`}
                  onClick={() => removeRow(index)}
                >
                  移除
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
      <button
        className="studio-add-row-button"
        type="button"
        onClick={() => onChange([...rows, createRow()])}
      >
        {field.addLabel}
      </button>
      {error ? <p className="studio-field-error" id={errorId}>{error.message}</p> : null}
    </fieldset>
  )
}
