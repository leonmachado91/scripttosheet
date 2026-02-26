import type { Projeto, Cena, ListarCenasResponse } from '../types';

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

async function callApi<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!API_URL) {
        console.warn(`[API] URL não configurada. Chamada "${action}" ignorada.`);
        return [] as unknown as T;
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, params }),
        redirect: 'follow',
    });

    if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.statusText}`);
    }

    const data = await response.json();
    if (data?.erro) throw new Error(data.erro);

    return data as T;
}

export const api = {
    listarProjetos: () => callApi<Projeto[]>('listarProjetos'),

    criarProjeto: (nome: string, docUrl: string) =>
        callApi<{ nome: string; sheetId: string; sheetUrl: string }>('criarProjeto', { nome, docUrl }),

    importarProjeto: (nome: string, sheetUrl: string) =>
        callApi<{ nome: string; sheetId: string; sheetUrl: string }>('importarProjeto', { nome, sheetUrl }),

    excluirProjeto: (linha: number) =>
        callApi<{ sucesso: boolean }>('excluirProjeto', { linha }),

    listarCenas: (sheetId: string) =>
        callApi<ListarCenasResponse>('listarCenas', { sheetId }),

    atualizarCena: (sheetId: string, linha: number, campos: Partial<Cena> & { extras?: Record<string, string> }) =>
        callApi<{ sucesso: boolean }>('atualizarCena', { sheetId, linha, campos }),

    adicionarCena: (sheetId: string, cena: Partial<Cena>) =>
        callApi<{ sucesso: boolean; ordem: number }>('adicionarCena', { sheetId, cena }),

    excluirCena: (sheetId: string, linha: number) =>
        callApi<{ sucesso: boolean }>('excluirCena', { sheetId, linha }),

    buscarPreviewLink: (url: string) =>
        callApi<{ title?: string; image?: string; description?: string } | null>('buscarPreviewLink', { url }),
};
