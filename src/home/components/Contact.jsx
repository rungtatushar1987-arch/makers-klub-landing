import './Contact.css'
import { CONTACT } from '../content'

export default function Contact() {
  const { founder } = CONTACT
  return (
    <section className="sc-contact" id="contact">
      <div className="sc-contact-inner">
        <div>
          <div className="sc-mast-label"><span className="sc-mast-eyebrow">{CONTACT.eyebrow}</span></div>
          <h2 className="h-xl sc-contact-title">{CONTACT.title}</h2>
          <p className="body-copy">{CONTACT.note}</p>
        </div>
        <div className="sc-contact-card">
          {founder.photo && <img src={founder.photo} alt={founder.name} />}
          <div className="sc-contact-name">{founder.name}</div>
          <div className="sc-contact-role">{founder.role}, The Solopreneurs Club</div>
          <div className="sc-contact-actions">
            <a href={`mailto:${CONTACT.email}`} className="btn-solid">Get in touch →</a>
            <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer" className="link-underline">LinkedIn</a>
          </div>
        </div>
      </div>
    </section>
  )
}
