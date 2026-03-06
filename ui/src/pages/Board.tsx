import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import KanbanBoard from '../components/board/KanbanBoard';
import { Target, User, RefreshCw, Layout, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Board() {
    const { profileId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isResearching, setIsResearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'directory' | 'outreach'>('directory');

    const handleFindMore = async () => {
        if (!user || !profileId) return;
        setIsResearching(true);
        try {
            const token = await user.getIdToken();
            const endpoint = activeTab === 'directory' ? '/api/research/start' : '/api/research/outreach';
            await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ profileId })
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsResearching(false);
        }
    };

    return (
        <div className="h-screen flex flex-col relative z-10">
            {/* Header */}
            <header className="glass-panel px-8 py-5 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/10 p-2.5 rounded-xl border border-blue-500/20 backdrop-blur-sm shadow-inner">
                        <Target className="text-blue-600 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">
                            {activeTab === 'directory' ? 'Directory Opportunities' : 'Outreach Opportunities'}
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className={`${isResearching ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`}></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-sm font-medium text-slate-500">
                                {isResearching ? 'Agent searching for more targets...' : 'Syncing to live database'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('directory')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'directory'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Layout size={16} />
                        Directories
                    </button>
                    <button
                        onClick={() => setActiveTab('outreach')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'outreach'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Mail size={16} />
                        Outreach
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/profile/${profileId}/edit`)}
                        className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-2"
                    >
                        <User size={16} />
                        Edit Profile
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-2"
                    >
                        <Layout size={16} />
                        All Boards
                    </button>
                    <button
                        onClick={handleFindMore}
                        disabled={isResearching}
                        className="btn-primary py-2.5 px-5 text-sm shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
                    >
                        {isResearching ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} />
                        )}
                        {isResearching ? 'Finding...' : activeTab === 'directory' ? 'Find Directories' : 'Find Outreach'}
                    </button>
                </div>
            </header>

            {/* Board Area */}
            <main className="flex-1 overflow-hidden p-6">
                <KanbanBoard profileId={profileId || ''} targetType={activeTab} />
            </main>
        </div>
    );
}
