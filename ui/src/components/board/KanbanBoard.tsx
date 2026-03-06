import { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuth } from '../../contexts/AuthContext';

import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import type { Column, Target } from '../../types';
import ColumnContainer from './ColumnContainer';
import TargetCard from './TargetCard';

const directoryCols: Column[] = [
    { id: 'shortlist', title: 'Shortlist' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'submitted', title: 'Submitted' },
    { id: 'rejected', title: 'Rejected' },
];

const outreachCols: Column[] = [
    { id: 'shortlist', title: 'Shortlist' },
    { id: 'drafting', title: 'Drafting' },
    { id: 'pitched', title: 'Pitched' },
    { id: 'rejected', title: 'Rejected' },
];

async function triggerPitchDraft(targetId: string, profileId: string) {
    try {
        await fetch('/api/pitch/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId, profileId }),
        });
    } catch (err) {
        console.error('Failed to trigger pitch draft:', err);
    }
}

export default function KanbanBoard({ profileId, targetType }: { profileId: string, targetType: 'directory' | 'outreach' }) {
    const { user } = useAuth();
    const columns = targetType === 'directory' ? directoryCols : outreachCols;
    const [targets, setTargets] = useState<Target[]>([]);
    const [activeTarget, setActiveTarget] = useState<Target | null>(null);

    useEffect(() => {
        if (!user || !profileId) return;

        const q = query(
            collection(db, "targets"),
            where("profileId", "==", profileId),
            where("type", "==", targetType)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dbTargets = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            })) as Target[];
            setTargets(dbTargets);
        });
        return () => unsubscribe();
    }, [profileId, user, targetType]);

    const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor)
    );

    return (
        <div className="w-full h-full overflow-x-auto custom-scrollbar">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                <div className="flex gap-6 h-full items-start p-8 min-w-max">
                    <SortableContext items={columnsId}>
                        {columns.map((col) => (
                            <ColumnContainer
                                key={col.id}
                                column={col}
                                targets={targets.filter((t) => t.columnId === col.id)}
                            />
                        ))}
                    </SortableContext>
                </div>

                <DragOverlay>
                    {activeTarget && <TargetCard target={activeTarget} />}
                </DragOverlay>
            </DndContext>
        </div>
    );

    function onDragStart(event: DragStartEvent) {
        if (event.active.data.current?.type === 'Target') {
            setActiveTarget(event.active.data.current.target);
            return;
        }
    }

    function onDragEnd(event: DragEndEvent) {
        setActiveTarget(null);
        const { active, over } = event;
        if (!over) return;

        if (active.id !== over.id) {
            // Future refactoring can go here if we want to re-order columns themselves
        }
    }

    function onDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const isActiveATarget = active.data.current?.type === 'Target';
        const isOverATarget = over.data.current?.type === 'Target';

        if (!isActiveATarget) return;

        // Dropping a Card over another Card
        if (isActiveATarget && isOverATarget) {
            setTargets((targets) => {
                const activeIndex = targets.findIndex((t) => t.id === active.id);
                const overIndex = targets.findIndex((t) => t.id === over.id);

                if (targets[activeIndex].columnId !== targets[overIndex].columnId) {
                    const newColumnId = targets[overIndex].columnId;
                    const previousColumnId = targets[activeIndex].columnId;
                    targets[activeIndex].columnId = newColumnId;

                    updateDoc(doc(db, "targets", active.id.toString()), { columnId: newColumnId }).catch(console.error);

                    // Trigger pitch generation when moving into Drafting
                    if (newColumnId === 'drafting' && previousColumnId !== 'drafting') {
                        triggerPitchDraft(active.id.toString(), profileId);
                    }

                    return arrayMove(targets, activeIndex, overIndex - 1);
                }

                return arrayMove(targets, activeIndex, overIndex);
            });
        }

        const isOverAColumn = over.data.current?.type === 'Column';

        // Dropping a Card over an empty Column
        if (isActiveATarget && isOverAColumn) {
            setTargets((targets) => {
                const activeIndex = targets.findIndex((t) => t.id === active.id);
                const newColumnId = over.id;
                const previousColumnId = targets[activeIndex].columnId;
                targets[activeIndex].columnId = newColumnId;

                updateDoc(doc(db, "targets", active.id.toString()), { columnId: newColumnId }).catch(console.error);

                // Trigger pitch generation when moving into Drafting
                if (newColumnId === 'drafting' && previousColumnId !== 'drafting') {
                    triggerPitchDraft(active.id.toString(), profileId);
                }

                return arrayMove(targets, activeIndex, activeIndex);
            });
        }
    }
}
