import { carregarPainel, ehAlerta, enviarRelato } from '../src/api';
import { alerta, instante, rascunho } from './cenarios';

const original = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = original;
});
const resposta = (json: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => json }) as Response;
test('pagina até o total reportado e suprime repetição entre páginas', async () => {
  const primeira = Array.from({ length: 50 }, (_, i) => ({ ...alerta, id: i + 1 }));
  const mock = jest
    .fn()
    .mockResolvedValueOnce(resposta({ itens: primeira, total: 52, atualizadoEm: instante }))
    .mockResolvedValueOnce(
      resposta({ itens: [primeira[49], { ...alerta, id: 51 }], total: 52, atualizadoEm: instante }),
    );
  globalThis.fetch = mock;
  const dados = await carregarPainel();
  expect(dados.itens.map((a) => a.id)).toEqual(Array.from({ length: 51 }, (_, i) => i + 1));
  expect(dados.atualizadoEm).toBe(instante);
  expect(mock.mock.calls[1][0]).toMatch(/page=1$/);
});
test('diferencia falta de transporte, HTTP de erro e contrato inválido', async () => {
  globalThis.fetch = jest
    .fn()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(resposta({ mensagem: 'Indisponível' }, 503))
    .mockResolvedValueOnce(resposta({ itens: [], total: 0 }));
  for (const tipo of ['offline', 'servico', 'dados'])
    await expect(carregarPainel()).rejects.toMatchObject({ tipo });
});
test('valida origem, nível de confiança e instante de cada evidência', () => {
  expect(ehAlerta(alerta)).toBe(true);
  for (const quebra of [
    { origem: 'X' },
    { confianca: 'CONFIRMADA' },
    { observadoEm: 'ontem' },
    { motivoConfianca: null },
  ]) {
    expect(ehAlerta({ ...alerta, evidencias: [{ ...alerta.evidencias[0], ...quebra }] })).toBe(false);
  }
});
test('dois envios usam a mesma chave e aceitam confirmação de replay', async () => {
  const recibo = { id: 19, alertaId: 12 };
  const mock = jest
    .fn()
    .mockResolvedValueOnce(resposta(recibo, 201))
    .mockResolvedValueOnce(resposta(recibo));
  globalThis.fetch = mock;
  expect(await enviarRelato(rascunho)).toEqual(recibo);
  expect(await enviarRelato(rascunho)).toEqual(recibo);
  expect(mock.mock.calls[1][1].body).toBe(mock.mock.calls[0][1].body);
});
