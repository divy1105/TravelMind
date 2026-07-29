import { SignIn } from '@clerk/clerk-react'

export default function SignInPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  )
}
