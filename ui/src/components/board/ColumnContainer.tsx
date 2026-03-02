import { useMemo } from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import type { Column, Target } from '../../types';
import TargetCard from './TargetCard';

interface Props {
    column: Column;
    targets: Target[];
}

export default function ColumnContainer({ column, targets }: Props) {
    const targetIds = useMemo(() => targets.map((t) => t.id), [targets]);

    const { setNodeRef, isDragging } = useSortable({
        id: column.id,
        data: { type: 'Column', column },
    });

    if (isDragging) {
        return (
            <div ref={setNodeRef} className="bg-slate-200/50 backdrop-blur-sm border-2 border-dashed border-blue-400 w-[350px] min-h-[500px] h-full rounded-2xl flex flex-col opacity-60" />
        );
    }

    return (
        <div ref={setNodeRef} className="bg-slate-200/30 backdrop-blur-lg w-[350px] max-h-[75vh] rounded-2xl flex flex-col shadow-sm border border-white/60">
            {/* Column Title */}
            <div className="bg-white/40 backdrop-blur-md text-slate-800 font-bold p-5 rounded-t-2xl border-b border-slate-200/50 flex items-center justify-between shadow-sm">
                <div className="flex gap-3 items-center tracking-tight">
                    <div className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-200/50">
                        {targets.length}
                    </div>
                    {column.title}
                </div>
            </div>

            {/* Column Content */}
            <div className="flex flex-col flex-grow gap-4 p-4 overflow-x-hidden overflow-y-auto custom-scrollbar">
                <SortableContext items={targetIds}>
                    {targets.map((target) => (
                        <TargetCard key={target.id} target={target} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}
