export type StatusType = 'Aberto' | 'Layout' | 'Animação' | 'Concluído' | 'Cancelado';

export interface Projeto {
    nome: string;
    docUrl: string;
    sheetId: string;
    data: string;
    linha: number;
}

export interface Cena {
    ordem: number;
    roteiro: string;
    comentario: string;
    tag: string;
    status: StatusType;
    obs: string;
    linha: number;
    extras: Record<string, string>;
}

export interface ListarCenasResponse {
    cenas: Cena[];
    extraColumns: string[];
}
