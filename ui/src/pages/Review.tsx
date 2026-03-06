import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Check, Edit2, Cloud, FileText, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Review() {
    const navigate = useNavigate()
    const location = useLocation()
    const { profileId } = useParams()
    const { user } = useAuth()

    const isEditMode = !!profileId;

    const [isEditing, setIsEditing] = useState(isEditMode) // Default to editing if in edit mode
    const [isLoading, setIsLoading] = useState(isEditMode) // Loading if we need to fetch
    const [isStarting, setIsStarting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [initialUrl, setInitialUrl] = useState(location.state?.targetUrl || 'Unknown URL');
    const [generatedProfileId, setGeneratedProfileId] = useState(location.state?.profile?.id || null);

    const [profile, setProfile] = useState({
        companyName: location.state?.profile?.companyName || '',
        shortDescription: location.state?.profile?.shortDescription || '',
        longDescription: location.state?.profile?.longDescription || '',
        keywords: location.state?.profile?.keywords ? location.state.profile.keywords.join(', ') : '',
        founderName: location.state?.profile?.founderName || '',
        dynamicFields: location.state?.profile?.dynamicFields || {} as Record<string, string>
    })

    const [newFieldName, setNewFieldName] = useState('')

    const isInitialMount = useRef(true);

    // Fetch existing profile if in edit mode
    useEffect(() => {
        const fetchProfile = async () => {
            if (!isEditMode || !user || !profileId) return;
            try {
                const token = await user.getIdToken();
                const res = await fetch(`/api/profile/get?profileId=${profileId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setInitialUrl(data.targetUrl);
                    setGeneratedProfileId(data.id);
                    setProfile({
                        companyName: data.companyName || '',
                        shortDescription: data.shortDescription || '',
                        longDescription: data.longDescription || '',
                        keywords: data.keywords ? data.keywords.join(', ') : '',
                        founderName: data.founderName || '',
                        dynamicFields: data.dynamicFields || {}
                    });
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [isEditMode, profileId, user]);

    // Auto-save logic
    useEffect(() => {
        if (isInitialMount.current || isLoading) {
            isInitialMount.current = false;
            return;
        }

        const timer = setTimeout(() => {
            saveProfile(profile);
        }, 1000); // Save after 1 second of no typing

        return () => clearTimeout(timer);
    }, [profile]);

    const saveProfile = async (updatedProfile: typeof profile) => {
        setIsSaving(true)
        try {
            if (!user) return;
            const token = await user.getIdToken();
            const keywordsArray = updatedProfile.keywords.split(',').map((k: string) => k.trim())
            await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: generatedProfileId,
                    targetUrl: initialUrl,
                    companyName: updatedProfile.companyName,
                    shortDescription: updatedProfile.shortDescription,
                    longDescription: updatedProfile.longDescription,
                    keywords: keywordsArray,
                    founderName: updatedProfile.founderName,
                    dynamicFields: updatedProfile.dynamicFields
                })
            });
        } catch (e) {
            console.error("Failed to auto-save profile", e)
        } finally {
            setIsSaving(false)
        }
    }

    const toggleEdit = async () => {
        if (isEditing) {
            // We were editing, now we are saving
            await saveProfile(profile)
        }
        setIsEditing(!isEditing)
    }

    const handlePrimaryAction = async () => {
        setIsStarting(true)
        try {
            if (!user) return;
            const token = await user.getIdToken();

            // Ensure latest state is saved before leaving
            await saveProfile(profile)

            if (isEditMode) {
                // If editing, just return to board
                navigate(`/board/${generatedProfileId}`)
            } else {
                // If new profile, start research phase
                await fetch('/api/research/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ profileId: generatedProfileId })
                });

                navigate(`/board/${generatedProfileId}`)
            }
        } catch (e) {
            console.error(e)
            setIsStarting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="md:flex md:items-center md:justify-between mb-10">
                <div className="flex-1 min-w-0 flex items-center gap-5">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 backdrop-blur-sm shadow-inner">
                        {isEditMode ? <FileText className="text-blue-600 w-8 h-8" /> : <Check className="text-emerald-600 w-8 h-8" />}
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl sm:truncate tracking-tight">
                            {isEditMode ? 'Edit Profile' : 'Profile Generated'}
                        </h2>
                        <div className="flex items-center gap-3">
                            <p className="text-base text-slate-500 mt-2 font-medium flex items-center gap-2">
                                Extracted from <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{initialUrl}</span>
                            </p>
                            {isSaving && (
                                <div className="flex items-center gap-1.5 text-blue-500 text-xs font-bold bg-blue-50 px-2 py-1 rounded-full mt-2 animate-pulse border border-blue-100">
                                    <Cloud className="w-3.5 h-3.5" />
                                    <span>Auto-saving...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex md:mt-0 md:ml-4 gap-4">
                    <button
                        onClick={toggleEdit}
                        className="btn-secondary"
                    >
                        <Edit2 size={18} className={isEditing ? 'text-blue-600' : 'text-slate-500'} />
                        {isEditing ? 'View Mode' : 'Edit Profile'}
                    </button>
                    <button
                        onClick={handlePrimaryAction}
                        disabled={isStarting}
                        className="btn-primary disabled:opacity-70"
                    >
                        {isStarting ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {isEditMode ? 'Saving...' : 'Starting...'}
                            </span>
                        ) : (isEditMode ? 'Save & Return' : 'Start Research Phase')}
                    </button>
                </div>
            </div>

            <div className="glass-panel overflow-hidden sm:rounded-2xl transition-all duration-300 hover:shadow-2xl hover:bg-white/80">
                <div className="px-6 py-8 sm:px-8 border-b border-slate-200/60 bg-white/40">
                    <h3 className="text-xl leading-6 font-bold text-slate-900">
                        Master Company Profile
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 font-medium max-w-3xl leading-relaxed">
                        This information will be used by the AI to autonomously fill directory submissions and write highly-targeted outreach pitches. Ensure all details are accurate before proceeding.
                    </p>
                </div>
                <div className="px-6 py-6 sm:p-0">
                    <dl className="sm:divide-y sm:divide-slate-200/60">
                        <div className="py-6 sm:py-8 sm:grid sm:grid-cols-3 sm:gap-6 sm:px-8 transition-colors hover:bg-slate-50/50">
                            <dt className="text-sm font-semibold text-slate-700 mt-2">
                                Company Name
                            </dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.companyName}
                                        onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                                        className="input-premium"
                                        placeholder="Official Business Name"
                                    />
                                ) : (
                                    <span className="font-bold text-slate-900 text-lg">{profile.companyName || <span className="text-slate-400 font-normal italic">No name provided</span>}</span>
                                )}
                            </dd>
                        </div>
                        <div className="py-6 sm:py-8 sm:grid sm:grid-cols-3 sm:gap-6 sm:px-8 transition-colors hover:bg-slate-50/50">
                            <dt className="text-sm font-semibold text-slate-700 mt-2">
                                Short Description
                            </dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <textarea
                                        value={profile.shortDescription}
                                        onChange={(e) => setProfile({ ...profile, shortDescription: e.target.value })}
                                        className="input-premium resize-y"
                                        rows={2}
                                    />
                                ) : (
                                    <span className="leading-relaxed text-slate-800 text-base">{profile.shortDescription}</span>
                                )}
                            </dd>
                        </div>
                        <div className="py-6 sm:py-8 sm:grid sm:grid-cols-3 sm:gap-6 sm:px-8 transition-colors hover:bg-slate-50/50">
                            <dt className="text-sm font-semibold text-slate-700 mt-2">
                                Long Description
                            </dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <textarea
                                        value={profile.longDescription}
                                        onChange={(e) => setProfile({ ...profile, longDescription: e.target.value })}
                                        className="input-premium resize-y"
                                        rows={4}
                                    />
                                ) : (
                                    <span className="leading-relaxed text-slate-800 text-base">{profile.longDescription}</span>
                                )}
                            </dd>
                        </div>
                        <div className="py-6 sm:py-8 sm:grid sm:grid-cols-3 sm:gap-6 sm:px-8 transition-colors hover:bg-slate-50/50">
                            <dt className="text-sm font-semibold text-slate-700 mt-2">
                                Target Keywords
                            </dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.keywords}
                                        onChange={(e) => setProfile({ ...profile, keywords: e.target.value })}
                                        className="input-premium"
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {profile.keywords.split(',').map((k: string) => (
                                            <span key={k} className="px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 font-semibold text-xs rounded-lg shadow-sm">{k.trim()}</span>
                                        ))}
                                    </div>
                                )}
                            </dd>
                        </div>
                        <div className="py-6 sm:py-8 sm:grid sm:grid-cols-3 sm:gap-6 sm:px-8 transition-colors hover:bg-slate-50/50 rounded-b-2xl">
                            <dt className="text-sm font-semibold text-slate-700 mt-2">
                                Founder / Contact Name
                            </dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={profile.founderName}
                                        onChange={(e) => setProfile({ ...profile, founderName: e.target.value })}
                                        className="input-premium"
                                    />
                                ) : (
                                    <span className="font-medium text-slate-800 text-base bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{profile.founderName}</span>
                                )}
                            </dd>
                        </div>

                        {/* Dynamic Fields Section */}
                        <div className="py-6 sm:py-8 sm:px-8 border-t border-slate-200/60 bg-slate-50/30">
                            <h4 className="text-lg font-bold text-slate-800 mb-4">Custom Fields</h4>
                            <div className="space-y-4">
                                {Object.entries(profile.dynamicFields).map(([key, value]) => (
                                    <div key={key} className="sm:grid sm:grid-cols-3 sm:gap-6 items-center">
                                        <dt className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                            {key}
                                            {isEditing && (
                                                <button
                                                    onClick={() => {
                                                        const newFields = { ...profile.dynamicFields };
                                                        delete newFields[key];
                                                        setProfile({ ...profile, dynamicFields: newFields });
                                                    }}
                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </dt>
                                        <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={value as string}
                                                    onChange={(e) => {
                                                        const newFields = { ...profile.dynamicFields };
                                                        newFields[key] = e.target.value;
                                                        setProfile({ ...profile, dynamicFields: newFields });
                                                    }}
                                                    className="input-premium"
                                                    placeholder="Field value..."
                                                />
                                            ) : (
                                                <span className="text-base text-slate-800">{value as string || <span className="text-slate-400 italic">Empty</span>}</span>
                                            )}
                                        </dd>
                                    </div>
                                ))}

                                {isEditing && (
                                    <div className="mt-6 pt-6 border-t border-slate-200/50">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block text-center sm:text-left">Quick Add Common Fields</label>
                                        <div className="flex flex-wrap gap-2 mb-4 justify-center sm:justify-start">
                                            {['Postcode', 'Telephone', 'Support Email', 'Address', 'Twitter Handle', 'LinkedIn URL'].map(suggestion => (
                                                <button
                                                    key={suggestion}
                                                    onClick={() => {
                                                        if (!profile.dynamicFields[suggestion]) {
                                                            setProfile({
                                                                ...profile,
                                                                dynamicFields: {
                                                                    ...profile.dynamicFields,
                                                                    [suggestion]: ''
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-full hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                                                >
                                                    + {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newFieldName}
                                                onChange={(e) => setNewFieldName(e.target.value)}
                                                placeholder="Custom Field Name (e.g. VAT Number)"
                                                className="input-premium flex-1"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newFieldName.trim()) {
                                                        const name = newFieldName.trim();
                                                        setProfile({
                                                            ...profile,
                                                            dynamicFields: {
                                                                ...profile.dynamicFields,
                                                                [name]: ''
                                                            }
                                                        });
                                                        setNewFieldName('');
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (newFieldName.trim()) {
                                                        const name = newFieldName.trim();
                                                        setProfile({
                                                            ...profile,
                                                            dynamicFields: {
                                                                ...profile.dynamicFields,
                                                                [name]: ''
                                                            }
                                                        });
                                                        setNewFieldName('');
                                                    }
                                                }}
                                                className="btn-secondary whitespace-nowrap"
                                            >
                                                Add Custom Field
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    )
}
