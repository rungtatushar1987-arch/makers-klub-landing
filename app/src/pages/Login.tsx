import { SignIn } from '@clerk/clerk-react'

export default function Login() {
  return (
    <div className="mkw-login">
      <div className="mkw-login-brand">
        <div className="mkw-login-mark">MK</div>
        <span className="mkw-login-name">Makers Klub</span>
      </div>
      <SignIn routing="path" path="/login" afterSignInUrl="/home" />
    </div>
  )
}
