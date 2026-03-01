import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, Edit2 } from 'lucide-react'

export default function Review() {
    const navigate = useNavigate()
    const location = useLocation()
    const initialUrl = location.state?.targetUrl || 'Unknown URL'
    const [isEditing, setIsEditing] = useState(false)
    const [isStarting, setIsStarting] = useState(false)

    const [profile, setProfile] = useState({
        shortDescription: 'A leading provider of SEO backlinking software.',
        longDescription: 'Our software helps companies build domain authority through automated directory submissions and intelligent pitching workflows driven by AI agents. We focus on high-quality, relevant links.',
        keywords: 'seo, software, backlinks, marketing, directories',
        founderName: 'Jane Doe'
    })

    const handleStartResearch = async () => {
        setIsStarting(true)
        // TODO: Connect to Go Backend /api/research/start
        await new Promise(resolve => setTimeout(resolve, 1000))
        navigate('/board')
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded-full">
                        <Check className="text-green-600 w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                            Profile Generated
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Based on analysis of {initialUrl}</p>
                    </div>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                        <Edit2 size={16} className="mr-2" />
                        {isEditing ? 'View Mode' : 'Edit Profile'}
                    </button>
                    <button
                        onClick={handleStartResearch}
                        disabled={isStarting}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-70"
                    >
                        {isStarting ? 'Starting...' : 'Start Research Phase'}
                    </button>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Master Company Profile
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        This information will be used by the AI to fill directory submissions and write outreach pitches.
                    </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">
                                Short Description
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <textarea
                                        value={profile.shortDescription}
                                        onChange={(e) => setProfile({ ...profile, shortDescription: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                        rows={2}
                                    />
                                ) : profile.shortDescription}
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">
                                Long Description
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <textarea
                                        value={profile.longDescription}
                                        onChange={(e) => setProfile({ ...profile, longDescription: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                        rows={4}
                                    />
                                ) : profile.longDescription}
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">
                                Keywords
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.keywords}
                                        onChange={(e) => setProfile({ ...profile, keywords: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {profile.keywords.split(',').map(k => (
                                            <span key={k} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">{k.trim()}</span>
                                        ))}
                                    </div>
                                )}
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">
                                Founder Name
                            </dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.founderName}
                                        onChange={(e) => setProfile({ ...profile, founderName: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                ) : profile.founderName}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    )
}
