import KanbanBoard from '../components/board/KanbanBoard';

export default function Board() {
    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-900">Research Backlink Targets</h1>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        Active Campaign
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        View Profile
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        Find More Targets
                    </button>
                </div>
            </header>

            {/* Board Area */}
            <main className="flex-1 overflow-hidden">
                <KanbanBoard />
            </main>
        </div>
    );
}
