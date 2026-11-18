import AsyncStorage from '@react-native-async-storage/async-storage';
import { bairros, Draft, tipos } from './domain';

const prefixo = 'riscourbano.v1.';
export async function lerLocal(chave: string): Promise<unknown> {
  await fila;
  try {
    const raw = await AsyncStorage.getItem(prefixo + chave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
// Serializa gravações para que uma tentativa anterior não substitua a mais recente.
let fila = Promise.resolve();
export function guardarLocal(chave: string, valor: unknown) {
  const salvar = () =>
    valor === null
      ? AsyncStorage.removeItem(prefixo + chave)
      : AsyncStorage.setItem(prefixo + chave, JSON.stringify(valor));
  const atual = fila.then(salvar);
  fila = atual.catch(() => {});
  return atual;
}
export function removerRascunho(chave: string) {
  const atual = fila.then(async () => {
    const raw = await AsyncStorage.getItem(prefixo + 'rascunho');
    if (raw && JSON.parse(raw).chave === chave) await AsyncStorage.removeItem(prefixo + 'rascunho');
  });
  fila = atual.catch(() => {});
  return atual;
}
export function ehRascunho(v: unknown): v is Draft {
  if (typeof v !== 'object' || !v) return false;
  const d = v as Draft;
  return (
    typeof d.chave === 'string' &&
    d.chave.length === 36 &&
    bairros.includes(d.bairro) &&
    tipos.includes(d.tipo) &&
    typeof d.duracao === 'string'
  );
}
