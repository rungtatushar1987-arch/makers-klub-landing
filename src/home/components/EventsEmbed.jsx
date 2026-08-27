import './EventsEmbed.css'

const LUMA_CALENDAR_URL = 'https://luma.com/cal-GBRc6zCvxA5bqnz'

export default function EventsEmbed() {
  return (
    <section className="sc-events" id="events">
      <div className="sc-events-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label">
              <span className="sc-mast-eyebrow">What's happening</span>
            </div>
            <h2 className="h-xl sc-events-title">Upcoming Sessions</h2>
          </div>
          <a href={LUMA_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="link-underline">
            View All Events →
          </a>
        </div>

        <div className="sc-luma-frame">
          <iframe
            src="https://luma.com/embed/calendar/cal-GBRc6zCvxA5bqnz/events"
            width="100%"
            height="560"
            frameBorder="0"
            style={{ border: 'none', display: 'block' }}
            allowFullScreen
            aria-hidden="false"
            tabIndex={0}
            title="The Solopreneurs Club — upcoming sessions calendar"
          />
        </div>
        <p className="sc-luma-powered">
          Powered by Luma —{' '}
          <a href={LUMA_CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            view full calendar →
          </a>
        </p>
      </div>
    </section>
  )
}
