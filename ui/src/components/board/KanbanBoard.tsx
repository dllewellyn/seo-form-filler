import { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";

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

const defaultCols: Column[] = [
    { id: 'shortlist', title: 'Shortlist' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'submitted', title: 'Submitted' },
    { id: 'contacted', title: 'Contacted' },
    { id: 'rejected', title: 'Rejected' },
];

export default function KanbanBoard() {
    const [columns] = useState<Column[]>(defaultCols);
    const [targets, setTargets] = useState<Target[]>([]);
    const [activeTarget, setActiveTarget] = useState<Target | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "targets"), (snapshot) => {
            const dbTargets = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            })) as Target[];
            setTargets(dbTargets);
        });
        return () => unsubscribe();
    }, []);

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
                    targets[activeIndex].columnId = newColumnId;
                    updateDoc(doc(db, "targets", active.id.toString()), { columnId: newColumnId }).catch(console.error);
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
                targets[activeIndex].columnId = newColumnId;
                updateDoc(doc(db, "targets", active.id.toString()), { columnId: newColumnId }).catch(console.error);
                return arrayMove(targets, activeIndex, activeIndex);
            });
        }
    }
}
