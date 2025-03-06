import { SignUp } from "@clerk/nextjs"

export default function RegisterPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create an Account
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Join GroupChatBotBuilder today
          </p>
        </div>
        <SignUp path="/register" routing="path" redirectUrl="/" />
      </div>
    </div>
  )
}
