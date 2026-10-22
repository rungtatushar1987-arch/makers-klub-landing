import './Newsletter.css'
import { NEWSLETTER } from '../content'

export default function Newsletter() {
  if (!NEWSLETTER.action) return null
  return (
    <section className="sc-news" id="newsletter">
      <div className="sc-news-inner">
        <div>
          <div className="sc-mast-label">
            <span className="sc-mast-eyebrow">{NEWSLETTER.eyebrow}</span>
          </div>
          <h2 className="h-xl sc-news-title">{NEWSLETTER.title}</h2>
          {NEWSLETTER.body && <p className="body-copy">{NEWSLETTER.body}</p>}
        </div>
        <form className="sc-news-form" action={NEWSLETTER.action} method="post" target="_blank">
          <label className="sc-news-label" htmlFor="sc-news-email">Email</label>
          <div className="sc-news-row">
            <input id="sc-news-email" name="email" type="email" required placeholder="you@example.com" />
            <button type="submit" className="btn-solid">Subscribe →</button>
          </div>
          <label className="sc-news-consent">
            <input type="checkbox" name="consent" required />
            <span>{NEWSLETTER.consent}</span>
          </label>
        </form>
      </div>
    </section>
  )
}
