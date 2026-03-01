import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Target } from '../../types';
import { Link2, FileText } from 'lucide-react';

interface Props {
    target: Target;
}

export default function TargetCard({ target }: Props) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
        id: target.id,
        data: { type: 'Target', target },
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 border-2 border-blue-500 p-4 bg-white rounded-xl shadow-sm cursor-grab h-[100px]"
            />
        );
    }

    // Typecast listeners to any to bypass the complex React DOM typing clash from dnd-kit
    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 cursor-grab hover:shadow-md transition-all group"
            {...attributes}
            {...(listeners as any)}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 text-sm truncate pr-2">{target.domain}</h4>
            </div>

            <a
                href={target.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-3"
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking link
            >
                <Link2 size={12} />
                {target.url.replace(/^https?:\/\//, '').split('/')[0]}
            </a>

            {target.pitchDraft && (
                <div className="bg-blue-50 text-blue-700 text-xs px-2 py-1.5 rounded flex items-center gap-2 w-max">
                    <FileText size={12} />
                    Draft Ready
                </div>
            )}
        </div>
    );
}
