import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'

export default function Setup() {
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return

        setIsLoading(true)

        try {
            // TODO: Connect to Go Backend /api/profile/generate
            // Simulate API call for now
            await new Promise(resolve => setTimeout(resolve, 1500))

            // Pass the mock URL state to the review page
            navigate('/review', { state: { targetUrl: url } })
        } catch (error) {
            console.error("Failed to generate profile", error)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col px-4">
            <div className="max-w-md w-full text-center mb-8">
                <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <Search className="text-blue-600 w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Backlink Engine</h1>
                <p className="text-gray-500">Enter your target website to generate your Master Company Profile.</p>
            </div>

            <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6">
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                            Website URL
                        </label>
                        <input
                            type="url"
                            id="url"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !url}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing Domain...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                Generate Profile
                                <ArrowRight size={18} />
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
