import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Setup() {
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()
    const { user } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url || !user) return

        setIsLoading(true)

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/profile/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                throw new Error('Failed to generate profile');
            }

            const profileData = await response.json();

            // Pass the returned ADK profile to the review page
            navigate('/review', { state: { targetUrl: url, profile: profileData } })
        } catch (error) {
            console.error("Failed to generate profile", error)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center flex-col px-4 relative z-10">
            <div className="max-w-xl w-full text-center mb-10">
                <div className="mx-auto bg-blue-600/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-blue-500/20 backdrop-blur-sm">
                    <Search className="text-blue-600 w-10 h-10" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Backlink Engine</h1>
                <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">Enter your target website to generate an AI-powered Master Company Profile.</p>
            </div>

            <div className="w-full max-w-lg glass-panel rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl">
                <form onSubmit={handleSubmit} className="p-8 sm:p-10">
                    <div className="mb-8 relative group">
                        <label htmlFor="url" className="block text-sm font-semibold text-slate-700 mb-3 ml-1">
                            Website URL
                        </label>
                        <div className="relative">
                            <input
                                type="url"
                                id="url"
                                className="input-premium pl-4 pr-4 transition-all"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !url}
                        className="btn-primary w-full disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing Domain...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 group-hover:gap-3 transition-all">
                                Generate Profile
                                <ArrowRight size={18} className="opacity-80" />
                            </span>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-6 font-medium">Powered by Gemini 2.5 Flash</p>
                </form>
            </div>
        </div>
    )
}
