import './Manifesto.css'
import { MANIFESTO } from '../content'

export default function Manifesto() {
  return (
    <section className="sc-manifesto">
      <p className="sc-manifesto-line">{MANIFESTO}</p>
    </section>
  )
}
