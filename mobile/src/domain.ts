export const tipos = ['ALAGAMENTO', 'CALOR', 'ENERGIA'] as const;
export const prioridades = ['ALTA', 'MEDIA', 'BAIXA'] as const;
export const bairros = ['Vila Mariana', 'Saúde', 'Moema', 'Campo Belo'] as const;
export type Tipo = typeof tipos[number];
export type Nivel = typeof prioridades[number];
export type Bairro = typeof bairros[number];
export type Origem = 'SENSOR' | 'PUBLICA' | 'COMUNIDADE';
export const nomeTipo: Record<Tipo, string> = { ALAGAMENTO: 'Alagamento', CALOR: 'Calor urbano', ENERGIA: 'Falta de energia' };
export const nomeNivel: Record<Nivel, string> = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };
export const nomeOrigem: Record<Origem, string> = { SENSOR: 'Sensor simulado', PUBLICA: 'Base pública histórica', COMUNIDADE: 'Relato comunitário' };
export interface Evidencia {
  id: number; origem: Origem; fonte: string; confianca: Nivel; motivoConfianca: string; observadoEm: string; descricao: string;
}
export interface Historico extends Evidencia { bairro: string; tipo: Tipo }
export interface Alerta {
  id: number; tipo: Tipo; bairro: string; prioridade: Nivel; impacto: number; pontos: number; observadoEm: string;
  titulo: string; motivos: string[]; evidencias: Evidencia[]; ativo: boolean;
}
export interface Snapshot { itens: Alerta[]; atualizadoEm: string }
export interface Draft { chave: string; bairro: Bairro; tipo: Tipo; duracao: string }
export interface Filtros { bairro: string; tipo: string; prioridade: string }
export const semFiltros: Filtros = { bairro: '', tipo: '', prioridade: '' };
export function filtrar(alertas: Alerta[], f: Filtros) {
  return alertas.filter(a => (!f.bairro || a.bairro === f.bairro) && (!f.tipo || a.tipo === f.tipo) && (!f.prioridade || a.prioridade === f.prioridade));
}
export function erroRelato(d: Draft) {
  if (!bairros.includes(d.bairro) || !tipos.includes(d.tipo)) return 'Escolha o bairro e o tipo da ocorrência.';
  if (d.tipo === 'ENERGIA' && (!/^\d{1,5}$/.test(d.duracao) || Number(d.duracao) > 10080))
    return 'Informe a duração em minutos, entre 0 e 10.080.';
  return null;
}
export function corpoRelato(d: Draft) {
  return { chave: d.chave, bairro: d.bairro, tipo: d.tipo, ...(d.tipo === 'ENERGIA' ? { duracaoMinutos: Number(d.duracao) } : {}) };
}
export type MemoriaAltas = Record<string, boolean>;
// Manter IDs ausentes evita renotificar um alerta que reaparece após queda da API.
export function transicoesAltas(anterior: MemoriaAltas | null, itens: Alerta[]) {
  const memoria = { ...anterior };
  const novas: Alerta[] = [];
  for (const a of itens) {
    const alta = a.prioridade === 'ALTA';
    if (anterior !== null && alta && !memoria[a.id]) novas.push(a);
    memoria[a.id] = alta;
  }
  return { memoria, novas };
}
const dataHora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const quando = (iso: string) => dataHora.format(new Date(iso));
export const horario = (iso: string) => hora.format(new Date(iso));
