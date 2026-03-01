import { useState, useMemo } from 'react';
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
];

const defaultTargets: Target[] = [
    { id: '1', columnId: 'shortlist', domain: 'startup.io', url: 'https://startup.io/submit', targetUrl: 'https://example.com' },
    { id: '2', columnId: 'shortlist', domain: 'techcrunch.com', url: 'https://techcrunch.com/submit', targetUrl: 'https://example.com' },
    { id: '3', columnId: 'in-progress', domain: 'producthunt.com', url: 'https://producthunt.com/new', targetUrl: 'https://example.com', pitchDraft: 'Hey PH team, we have a great tool...' },
];

export default function KanbanBoard() {
    const [columns] = useState<Column[]>(defaultCols);
    const [targets, setTargets] = useState<Target[]>(defaultTargets);
    const [activeTarget, setActiveTarget] = useState<Target | null>(null);

    const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor)
    );

    return (
        <div className="p-8 w-full h-full overflow-x-auto">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                <div className="flex gap-6 h-full items-start">
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
                    targets[activeIndex].columnId = targets[overIndex].columnId;
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
                targets[activeIndex].columnId = over.id;
                return arrayMove(targets, activeIndex, activeIndex);
            });
        }
    }
}
