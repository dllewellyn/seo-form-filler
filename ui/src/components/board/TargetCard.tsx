import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Target } from '../../types';
import { Link2, FileText, StickyNote } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from "firebase/firestore";

interface Props {
    target: Target;
}

export default function TargetCard({ target }: Props) {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(target.notes || "");

    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
        id: target.id,
        disabled: isEditingNote, // Disable drag when editing note
        data: { type: 'Target', target },
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    const saveNote = async () => {
        setIsEditingNote(false);
        try {
            await updateDoc(doc(db, "targets", target.id.toString()), {
                notes: noteText
            });
        } catch (err) {
            console.error("Failed to save note:", err);
        }
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-60 border border-blue-400 bg-white/50 backdrop-blur-sm rounded-xl shadow-lg ring-4 ring-blue-500/20 scale-105 cursor-grabbing p-5 h-[120px]"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80 hover:border-blue-400/80 cursor-grab hover:shadow-lg transition-all duration-200 group active:scale-[0.98]"
            {...attributes}
            {...(listeners as any)}
        >
            <div className="flex justify-between items-start mb-2.5">
                <h4 className="font-bold text-slate-800 text-sm truncate pr-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{target.domain}</h4>
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setIsEditingNote(!isEditingNote)}
                    className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${target.notes ? 'text-blue-500' : 'text-slate-400'}`}
                >
                    <StickyNote size={14} />
                </button>
            </div>

            <a
                href={target.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1.5 mb-4 group/link overflow-hidden"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <Link2 size={12} className="text-slate-300 group-hover/link:text-blue-400 transition-colors shrink-0" />
                <span className="truncate">{target.url.replace(/^https?:\/\//, '').split('/')[0]}</span>
            </a>

            <div className="flex flex-wrap gap-2 mb-2">
                {target.pitchDraft && (
                    <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded border border-emerald-200/50 flex items-center gap-1">
                        <FileText size={10} className="text-emerald-500" />
                        Pitch
                    </div>
                )}
                {target.columnId === 'rejected' && (
                    <div className="bg-rose-50 text-rose-700 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded border border-rose-200/50 flex items-center gap-1">
                        Rejected
                    </div>
                )}
            </div>

            {(isEditingNote || target.notes) && (
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="mt-3 pt-3 border-t border-slate-100"
                >
                    {isEditingNote ? (
                        <textarea
                            autoFocus
                            className="w-full text-xs p-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-h-[60px]"
                            placeholder="Add rejection notes..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onBlur={saveNote}
                        />
                    ) : (
                        <p
                            className="text-[11px] text-slate-500 italic line-clamp-2 hover:line-clamp-none cursor-pointer"
                            onClick={() => setIsEditingNote(true)}
                        >
                            {target.notes}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
