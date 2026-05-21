import { SignUp } from '@clerk/clerk-react'

export default function Signup() {
  return (
    <div className="mkw-login">
      <div className="mkw-login-brand">
        <div className="mkw-login-mark">MK</div>
        <span className="mkw-login-name">Makers Klub</span>
      </div>
      <SignUp routing="path" path="/signup" afterSignUpUrl="/home" />
    </div>
  )
}
