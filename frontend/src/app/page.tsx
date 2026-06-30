import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Sky News Interactive Display
      </h1>
      <p className="text-lg text-gray-600 mb-12 text-center max-w-xl">
        AI-powered news display system. Open the display on your TV screen and
        the tablet interface on your tablet device.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <Link
          href="/display"
          className="block p-8 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-2xl hover:border-orange-400 hover:shadow-lg transition-all text-center"
        >
          <div className="text-5xl mb-4">🖥️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Display View
          </h2>
          <p className="text-gray-600">For the entrance TV screen</p>
        </Link>

        <Link
          href="/tablet"
          className="block p-8 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-2xl hover:border-orange-400 hover:shadow-lg transition-all text-center"
        >
          <div className="text-5xl mb-4">📱</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tablet View
          </h2>
          <p className="text-gray-600">For the input tablet nearby</p>
        </Link>
      </div>

      <p className="mt-12 text-sm text-gray-400">
        Tip: Add ?session=myroom to both URLs to sync them
      </p>
    </div>
  );
}
