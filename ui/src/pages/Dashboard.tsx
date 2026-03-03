import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FolderGit2, Plus, LogOut, Loader2, ArrowRight } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import type { Profile } from '../types';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfiles = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const res = await fetch('/api/profiles', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setProfiles(data || []);
                }
            } catch (err) {
                console.error("Failed to fetch campaigns", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-inner border border-blue-500">
                        <FolderGit2 className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-tight">Your Campaigns</h1>
                        <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/setup')}
                        className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                    >
                        <Plus size={16} />
                        New Campaign
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-slate-500 hover:text-slate-800 transition-colors p-2"
                        title="Sign out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-8">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : profiles.length === 0 ? (
                    <div className="text-center py-20 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FolderGit2 className="w-10 h-10 text-slate-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">No campaigns yet</h2>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">
                            Create your first SEO backlink campaign by entering a target URL and generating a master profile.
                        </p>
                        <button
                            onClick={() => navigate('/setup')}
                            className="btn-primary py-3 px-6 inline-flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Create First Campaign
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {profiles.map((profile) => (
                            <div
                                key={profile.id}
                                onClick={() => navigate(`/board/${profile.id}`)}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full overflow-hidden"
                            >
                                <div className="p-6 flex-grow">
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="text-lg font-bold text-slate-900 line-clamp-1">
                                            {profile.companyName || new URL(profile.targetUrl).hostname}
                                        </h3>
                                        <div className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">
                                            {profile.keywords?.length || 0} keywords
                                        </div>
                                    </div>

                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                        {profile.shortDescription || 'No description available'}
                                    </p>

                                    <div className="text-xs text-slate-500 flex items-center gap-1 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap">
                                        {profile.targetUrl}
                                    </div>
                                </div>

                                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between group-hover:bg-blue-50/50 transition-colors">
                                    <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">Open Board</span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
