import { Platform } from 'react-native';
import { Alerta, corpoRelato, Draft, Evidencia, Historico, prioridades, Snapshot, tipos } from './domain';

export const baseURL = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080')).replace(/\/+$/, '');
export type Falha = 'offline' | 'servico' | 'dados';
export class ErroApi extends Error {
  constructor(readonly tipo: Falha, mensagem: string) { super(mensagem); }
}
async function pedir(caminho: string, opcoes?: RequestInit): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const r = await fetch(baseURL + caminho, { ...opcoes, signal: ctrl.signal });
    if (!r.ok) {
      const e = await r.json().catch(() => null);
      throw new ErroApi('servico', typeof e?.mensagem === 'string' ? e.mensagem : 'Serviço indisponível (HTTP ' + r.status + ').');
    }
    try { return await r.json(); } catch { throw new ErroApi('dados', 'A resposta do servidor não é um JSON válido.'); }
  } catch (e) {
    if (e instanceof ErroApi) throw e;
    throw new ErroApi('offline', 'Sem conexão com o servidor');
  } finally { clearTimeout(timer); }
}
const objeto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object';
const inteiro = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const texto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const instante = (v: unknown): v is string => texto(v) && Number.isFinite(Date.parse(v));
const em = (opcoes: readonly string[], v: unknown) => typeof v === 'string' && opcoes.includes(v);
const invalida = () => new ErroApi('dados', 'O servidor enviou dados em formato inesperado.');
export function ehEvidencia(v: unknown): v is Evidencia {
  return objeto(v) && inteiro(v.id) && em(['SENSOR', 'PUBLICA', 'COMUNIDADE'], v.origem) && em(prioridades, v.confianca) &&
    texto(v.fonte) && texto(v.motivoConfianca) && instante(v.observadoEm) && texto(v.descricao);
}
export function ehAlerta(v: unknown): v is Alerta {
  return objeto(v) && inteiro(v.id) && em(tipos, v.tipo) && em(prioridades, v.prioridade) && texto(v.bairro) &&
    instante(v.observadoEm) && texto(v.titulo) && inteiro(v.impacto) && inteiro(v.pontos) && typeof v.ativo === 'boolean' &&
    Array.isArray(v.evidencias) && v.evidencias.every(ehEvidencia) && Array.isArray(v.motivos) && v.motivos.every(texto);
}
export function ehHistorico(v: unknown): v is Historico {
  return objeto(v) && em(tipos, v.tipo) && texto(v.bairro) && ehEvidencia(v);
}
export function ehSnapshot(v: unknown): v is Snapshot {
  return objeto(v) && instante(v.atualizadoEm) && Array.isArray(v.itens) && v.itens.every(ehAlerta);
}
async function paginas<T extends {id: number}>(caminho: string, validar: (v: unknown) => v is T) {
  const salvos = new Map<number, T>();
  let atualizadoEm = '', paginasNaAbertura = 1;
  for (let pagina = 0; pagina < paginasNaAbertura; pagina++) {
    const r = await pedir(caminho + (caminho.includes('?') ? '&' : '?') + 'size=50&page=' + pagina);
    if (!objeto(r) || !Array.isArray(r.itens) || !r.itens.every(validar) || !inteiro(r.total) || r.total < 0) throw invalida();
    if (pagina === 0) {
      paginasNaAbertura = Math.ceil(r.total / 50);
      if (instante(r.atualizadoEm)) atualizadoEm = r.atualizadoEm;
    }
    for (const item of r.itens) salvos.set(item.id, item);
    if (r.itens.length < 50) break;
  }
  return { itens: [...salvos.values()], atualizadoEm };
}
export async function carregarPainel(): Promise<Snapshot> {
  const p = await paginas('/api/alertas', ehAlerta);
  if (!p.atualizadoEm) throw invalida();
  return p;
}
export async function carregarHistorico() { return (await paginas('/api/observacoes?origem=PUBLICA', ehHistorico)).itens; }
export async function carregarAlerta(id: number) {
  const a = await pedir('/api/alertas/' + id);
  if (!ehAlerta(a)) throw invalida();
  return a;
}
export async function enviarRelato(d: Draft) {
  const r = await pedir('/api/relatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpoRelato(d)) });
  if (!objeto(r) || !inteiro(r.id) || !inteiro(r.alertaId)) throw invalida();
  return { id: r.id, alertaId: r.alertaId };
}
