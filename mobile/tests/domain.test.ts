import { corpoRelato, erroRelato, filtrar, semFiltros, transicoesAltas } from '../src/domain';
import { alerta, rascunho } from './cenarios';

test('linha de base e reconexão não renotificam a mesma prioridade', () => {
  const inicial = transicoesAltas(null, [alerta]);
  expect(inicial.novas).toEqual([]);
  const ausente = transicoesAltas(inicial.memoria, []);
  expect(transicoesAltas(ausente.memoria, [{ ...alerta, titulo: 'Descrição revisada' }]).novas).toEqual(
    [],
  );
});
test('emite alta nova e nova elevação, sem repetir a cada consulta', () => {
  const a = transicoesAltas({}, [alerta]);
  expect(a.novas).toEqual([alerta]);
  const b = transicoesAltas(a.memoria, [{ ...alerta, prioridade: 'MEDIA' }]);
  expect(b.novas).toEqual([]);
  const c = transicoesAltas(b.memoria, [alerta]);
  expect(c.novas).toEqual([alerta]);
  expect(transicoesAltas(c.memoria, [alerta]).novas).toEqual([]);
});
test('combina os três filtros e preserva a ordenação da API', () => {
  const outros = [
    alerta,
    { ...alerta, id: 13, bairro: 'Saúde' },
    { ...alerta, id: 14, prioridade: 'BAIXA' as const },
  ];
  expect(filtrar(outros, semFiltros)).toEqual(outros);
  expect(filtrar(outros, { bairro: 'Vila Mariana', tipo: 'ALAGAMENTO', prioridade: 'ALTA' })).toEqual([
    alerta,
  ]);
  expect(filtrar(outros, { ...semFiltros, tipo: 'ENERGIA' })).toEqual([]);
});
test.each(['', '-1', '3.5', '10081', '30 min'])('rejeita duração inválida %s', (duracao) =>
  expect(erroRelato({ ...rascunho, duracao })).toBeTruthy(),
);
test.each(['0', '10080'])('aceita a borda %s', (duracao) =>
  expect(erroRelato({ ...rascunho, duracao })).toBeNull(),
);
test('preserva a chave de reenvio e omite duração em relatos qualitativos', () => {
  expect(corpoRelato(rascunho)).toEqual({
    chave: rascunho.chave,
    bairro: 'Moema',
    tipo: 'ENERGIA',
    duracaoMinutos: 60,
  });
  expect(corpoRelato({ ...rascunho, tipo: 'CALOR' })).toEqual({
    chave: rascunho.chave,
    bairro: 'Moema',
    tipo: 'CALOR',
  });
});
