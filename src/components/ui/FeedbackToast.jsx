export default function FeedbackToast({ message, onClose }) {
  return (
    <div className="feedback-region" aria-live="polite" aria-atomic="true">
      {message ? (
        <div className="feedback-toast" role="status">
          <span>{message}</span>
          <button type="button" aria-label="關閉提示" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  )
}
