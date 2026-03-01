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
            <div ref={setNodeRef} className="bg-gray-200 opacity-40 border-2 border-pink-500 w-[350px] h-[500px] max-h-[500px] rounded-md flex flex-col" />
        );
    }

    return (
        <div ref={setNodeRef} className="bg-gray-100 w-[350px] h-[70vh] rounded-xl flex flex-col shadow-sm border border-gray-200">
            {/* Column Title */}
            <div className="bg-white text-gray-800 font-semibold p-4 rounded-t-xl border-b border-gray-200 flex items-center justify-between">
                <div className="flex gap-2 items-center">
                    <div className="bg-gray-200 px-2 py-1 rounded-full text-xs font-bold text-gray-600">
                        {targets.length}
                    </div>
                    {column.title}
                </div>
            </div>

            {/* Column Content */}
            <div className="flex flex-col flex-grow gap-4 p-4 overflow-x-hidden overflow-y-auto">
                <SortableContext items={targetIds}>
                    {targets.map((target) => (
                        <TargetCard key={target.id} target={target} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}
