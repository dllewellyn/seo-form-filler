import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KanbanBoard from '../components/board/KanbanBoard';
import { Target, User, RefreshCw } from 'lucide-react';

export default function Board() {
    const navigate = useNavigate();
    const [isResearching, setIsResearching] = useState(false);

    const handleFindMore = async () => {
        setIsResearching(true);
        try {
            await fetch('/api/research/start', { method: 'POST' });
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
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">Backlink Opportunities</h1>
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
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/review')}
                        className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-2"
                    >
                        <User size={16} />
                        View Profile
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
                        {isResearching ? 'Finding...' : 'Find More Targets'}
                    </button>
                </div>
            </header>

            {/* Board Area */}
            <main className="flex-1 overflow-hidden p-6">
                <KanbanBoard />
            </main>
        </div>
    );
}
