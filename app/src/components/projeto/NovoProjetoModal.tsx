import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { X, Plus, FileText, Loader2, Link2 } from 'lucide-react';

interface NovoProjetoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'novo' | 'existente';

export function NovoProjetoModal({ isOpen, onClose }: NovoProjetoModalProps) {
    const [tab, setTab] = useState<Tab>('novo');
    const [nome, setNome] = useState('');
    const [docUrl, setDocUrl] = useState('');
    const [sheetUrl, setSheetUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const queryClient = useQueryClient();

    if (!isOpen) return null;

    const reset = () => {
        setNome('');
        setDocUrl('');
        setSheetUrl('');
        setError(null);
    };

    const handleSubmitNovo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim() || !docUrl.trim()) return;
        try {
            setIsSubmitting(true);
            setError(null);
            await api.criarProjeto(nome.trim(), docUrl.trim());
            queryClient.invalidateQueries({ queryKey: ['projetos'] });
            onClose();
            reset();
        } catch (err: any) {
            setError(err.message || 'Erro ao criar projeto.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitExistente = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim() || !sheetUrl.trim()) return;
        try {
            setIsSubmitting(true);
            setError(null);
            await api.importarProjeto(nome.trim(), sheetUrl.trim());
            queryClient.invalidateQueries({ queryKey: ['projetos'] });
            onClose();
            reset();
        } catch (err: any) {
            setError(err.message || 'Erro ao importar projeto.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gruv-bg-hard border border-gruv-bg-soft rounded-xl shadow-2xl w-full max-w-md overflow-hidden" role="dialog">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gruv-bg-soft bg-gruv-bg">
                    <h3 className="text-base font-bold text-gruv-fg0">Adicionar Projeto</h3>
                    <button onClick={onClose} className="text-gruv-gray hover:text-gruv-fg p-1 rounded-lg hover:bg-gruv-bg-soft transition-colors" disabled={isSubmitting} title="Fechar">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gruv-bg-soft">
                    <button
                        onClick={() => { setTab('novo'); setError(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors
                            ${tab === 'novo'
                                ? 'text-gruv-yellow border-b-2 border-gruv-yellow bg-gruv-bg-soft/30'
                                : 'text-gruv-gray hover:text-gruv-fg2'}`}
                    >
                        <FileText size={14} /> Novo (via Doc)
                    </button>
                    <button
                        onClick={() => { setTab('existente'); setError(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors
                            ${tab === 'existente'
                                ? 'text-gruv-yellow border-b-2 border-gruv-yellow bg-gruv-bg-soft/30'
                                : 'text-gruv-gray hover:text-gruv-fg2'}`}
                    >
                        <Link2 size={14} /> Planilha Existente
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-lg bg-gruv-red/10 border border-gruv-red/20 text-gruv-red text-sm">
                        {error}
                    </div>
                )}

                {/* Tab: Novo */}
                {tab === 'novo' && (
                    <form onSubmit={handleSubmitNovo} className="p-6 space-y-4">
                        <div>
                            <label htmlFor="nome-novo" className="block text-[10px] font-bold text-gruv-gray uppercase tracking-wider mb-1.5">Nome do Projeto</label>
                            <input id="nome-novo" type="text" autoFocus required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Documentário Guerra Fria" disabled={isSubmitting}
                                className="w-full bg-gruv-bg border border-gruv-bg-soft text-gruv-fg text-sm rounded-lg focus:ring-1 focus:ring-gruv-yellow focus:border-gruv-yellow p-2.5 outline-none" />
                        </div>
                        <div>
                            <label htmlFor="doc-url" className="block text-[10px] font-bold text-gruv-gray uppercase tracking-wider mb-1.5">URL do Roteiro (Google Docs)</label>
                            <input id="doc-url" type="url" required value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://docs.google.com/document/d/.../edit" disabled={isSubmitting}
                                className="w-full bg-gruv-bg border border-gruv-bg-soft text-gruv-fg text-sm rounded-lg focus:ring-1 focus:ring-gruv-yellow focus:border-gruv-yellow p-2.5 outline-none font-mono" />
                            <p className="mt-1.5 text-[11px] text-gruv-gray">Extrai comentários e parágrafos para gerar a Shotlist.</p>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-xs font-bold text-gruv-fg4 hover:text-gruv-fg2 transition-colors">Cancelar</button>
                            <button type="submit" disabled={isSubmitting || !nome || !docUrl}
                                className="flex items-center gap-2 px-5 py-2 bg-gruv-yellow text-gruv-bg text-xs font-bold rounded-lg hover:bg-gruv-yellow/90 transition-colors disabled:opacity-50">
                                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Processando...</> : <><Plus size={14} /> Criar Projeto</>}
                            </button>
                        </div>
                    </form>
                )}

                {/* Tab: Existente */}
                {tab === 'existente' && (
                    <form onSubmit={handleSubmitExistente} className="p-6 space-y-4">
                        <div>
                            <label htmlFor="nome-exist" className="block text-[10px] font-bold text-gruv-gray uppercase tracking-wider mb-1.5">Nome do Projeto</label>
                            <input id="nome-exist" type="text" autoFocus required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Documentário Guerra Fria" disabled={isSubmitting}
                                className="w-full bg-gruv-bg border border-gruv-bg-soft text-gruv-fg text-sm rounded-lg focus:ring-1 focus:ring-gruv-yellow focus:border-gruv-yellow p-2.5 outline-none" />
                        </div>
                        <div>
                            <label htmlFor="sheet-url" className="block text-[10px] font-bold text-gruv-gray uppercase tracking-wider mb-1.5">URL da Planilha (Google Sheets)</label>
                            <input id="sheet-url" type="url" required value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit" disabled={isSubmitting}
                                className="w-full bg-gruv-bg border border-gruv-bg-soft text-gruv-fg text-sm rounded-lg focus:ring-1 focus:ring-gruv-yellow focus:border-gruv-yellow p-2.5 outline-none font-mono" />
                            <p className="mt-1.5 text-[11px] text-gruv-gray">A planilha será importada diretamente. As colunas serão identificadas pelo cabeçalho.</p>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-xs font-bold text-gruv-fg4 hover:text-gruv-fg2 transition-colors">Cancelar</button>
                            <button type="submit" disabled={isSubmitting || !nome || !sheetUrl}
                                className="flex items-center gap-2 px-5 py-2 bg-gruv-green text-gruv-bg text-xs font-bold rounded-lg hover:bg-gruv-green/90 transition-colors disabled:opacity-50">
                                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Importando...</> : <><Link2 size={14} /> Importar Planilha</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
