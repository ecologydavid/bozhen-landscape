export default function ContactActions({ onUnavailable }) {
  return (
    <section className="contact-actions" aria-label="其他聯絡方式">
      <div className="container contact-actions__inner">
        <p>也可以選擇你習慣的方式與我們聯絡</p>
        <div>
          <button
            type="button"
            onClick={() =>
              onUnavailable('LINE 聯絡功能將於正式上線時開放')
            }
          >
            LINE 聯絡
          </button>
          <button
            type="button"
            onClick={() =>
              onUnavailable('Email 聯絡功能將於正式上線時開放')
            }
          >
            Email 聯絡
          </button>
        </div>
      </div>
    </section>
  )
}
