import { SignIn } from '@clerk/clerk-react'

export default function Login() {
  return (
    <div className="mkw-login">
      <div className="mkw-login-brand">
        <img src="logo.svg" alt="Makers Klub" />
        <span className="mkw-login-name">Makers Klub</span>
      </div>
      <SignIn routing="path" path="/login" afterSignInUrl="/home" />
    </div>
  )
}
