import type { Alerta } from './domain';
export type Permissao = 'concedida' | 'pendente' | 'negada' | 'indisponivel';
export const permissao = async (): Promise<Permissao> => 'indisponivel';
export const pedirPermissao = permissao;
export const emitir = async (_a: Alerta) => {};
export const observarToques = (_abrir: (id: number) => void) => () => {};
