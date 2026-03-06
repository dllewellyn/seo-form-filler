import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Copy, Check, Save, Bold, Italic, Underline,
    List, AlignLeft, Type, Maximize2, Minimize2, ChevronDown
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface PitchEditorProps {
    targetId: string;
    initialDraft: string;
    domain: string;
    onClose: () => void;
}

type FormatCommand =
    | 'bold' | 'italic' | 'underline' | 'insertUnorderedList'
    | 'justifyLeft' | 'formatBlock';

function ToolbarButton({
    onClick,
    title,
    active,
    children,
}: {
    onClick: () => void;
    title: string;
    active?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={title}
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all text-sm font-medium
                ${active
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
        >
            {children}
        </button>
    );
}

export default function PitchEditor({ targetId, initialDraft, domain, onClose }: PitchEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
    const [wordCount, setWordCount] = useState(0);
    const [isExpanded, setIsExpanded] = useState(true);

    // Convert plain text with newlines to HTML, or use as-is if already HTML
    const toHTML = (text: string) => {
        if (text.includes('<') && text.includes('>')) return text;
        return text
            .split('\n\n')
            .map(para => {
                const lines = para.split('\n').join('<br/>');
                return `<p>${lines}</p>`;
            })
            .join('');
    };

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = toHTML(initialDraft);
            updateWordCount();
        }
    }, []);

    const updateWordCount = useCallback(() => {
        if (!editorRef.current) return;
        const text = editorRef.current.innerText || '';
        setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    }, []);

    const updateActiveFormats = useCallback(() => {
        const formats = new Set<string>();
        if (document.queryCommandState('bold')) formats.add('bold');
        if (document.queryCommandState('italic')) formats.add('italic');
        if (document.queryCommandState('underline')) formats.add('underline');
        setActiveFormats(formats);
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const exec = (cmd: FormatCommand, value?: string) => {
        editorRef.current?.focus();
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand(cmd, false, value);
        updateActiveFormats();
    };

    const getPlainText = () => {
        if (!editorRef.current) return '';
        return editorRef.current.innerText || '';
    };

    const getHTML = () => {
        if (!editorRef.current) return '';
        return editorRef.current.innerHTML || '';
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'targets', targetId), {
                pitchDraft: getHTML(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Failed to save pitch draft:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getPlainText()).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return createPortal(
        <div className={`fixed inset-0 z-50 flex items-center justify-center
            ${isExpanded ? '' : 'bg-black/40 backdrop-blur-sm p-4 md:p-8'}`}>
            <div
                className={`bg-white flex flex-col overflow-hidden transition-all duration-200
                    ${isExpanded
                        ? 'w-full h-full'
                        : 'w-full max-w-3xl rounded-2xl shadow-2xl'
                    }`}
                style={isExpanded ? undefined : { height: 'min(88vh, 760px)' }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                            <Type size={14} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Pitch Draft</p>
                            <p className="text-[11px] text-slate-400">{domain}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full border
                            ${wordCount < 100
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : wordCount > 220
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}>
                            {wordCount} words
                        </span>

                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                        >
                            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            {copied ? 'Copied!' : 'Copy text'}
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                ${saved
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                                }`}
                        >
                            {saved ? <Check size={12} /> : <Save size={12} />}
                            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
                        </button>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Formatting Toolbar ── */}
                <div className="flex items-center gap-0.5 px-4 py-2 border-b border-slate-100 bg-slate-50/60 shrink-0 flex-wrap">
                    <ToolbarButton onClick={() => exec('bold')} title="Bold (⌘B)" active={activeFormats.has('bold')}>
                        <Bold size={13} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => exec('italic')} title="Italic (⌘I)" active={activeFormats.has('italic')}>
                        <Italic size={13} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => exec('underline')} title="Underline (⌘U)" active={activeFormats.has('underline')}>
                        <Underline size={13} />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-slate-200 mx-1.5" />

                    <ToolbarButton onClick={() => exec('formatBlock', 'h2')} title="Heading">
                        <span className="text-[11px] font-bold">H2</span>
                    </ToolbarButton>
                    <ToolbarButton onClick={() => exec('formatBlock', 'p')} title="Paragraph">
                        <AlignLeft size={13} />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet list">
                        <List size={13} />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-slate-200 mx-1.5" />

                    {/* Fullscreen toggle */}
                    <ToolbarButton
                        onClick={() => setIsExpanded(e => !e)}
                        title={isExpanded ? 'Compact view' : 'Fullscreen editor'}
                    >
                        {isExpanded
                            ? <Minimize2 size={13} />
                            : <Maximize2 size={13} />}
                    </ToolbarButton>

                    <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                        <ChevronDown size={11} />
                        <span>Auto-saved on close</span>
                    </div>
                </div>

                {/* ── Editor Body ── */}
                <div className="flex-1 overflow-y-auto">
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={updateWordCount}
                        onKeyUp={updateActiveFormats}
                        onMouseUp={updateActiveFormats}
                        className="min-h-full px-10 py-8 text-slate-800 text-[15px] leading-7 focus:outline-none pitch-editor-content"
                        style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}
                    />
                </div>

                {/* ── Footer tip ── */}
                <div className="shrink-0 px-6 py-2.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                        <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">⌘B</kbd>{' '}
                        Bold &nbsp;·&nbsp;
                        <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">⌘I</kbd>{' '}
                        Italic &nbsp;·&nbsp;
                        <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">⌘U</kbd>{' '}
                        Underline
                    </p>
                    <p className="text-[11px] text-slate-400">Target: 150–220 words</p>
                </div>
            </div>
        </div>
        , document.body);
}
