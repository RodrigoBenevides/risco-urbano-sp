import { act, renderHook } from '@testing-library/react-native';
import { carregarPainel, ErroApi } from '../src/api';
import { useMonitor } from '../src/monitor';
import { emitir } from '../src/notificacoes';
import { guardarLocal, lerLocal } from '../src/storage';
import { alerta, instante } from './cenarios';

jest.mock('../src/api', () => ({ ...jest.requireActual('../src/api'), carregarPainel: jest.fn() }));
jest.mock('../src/storage', () => ({ lerLocal: jest.fn(), guardarLocal: jest.fn() }));
jest.mock('../src/notificacoes', () => ({ emitir: jest.fn() }));
afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});
test('monta offline com cache, recupera sem alertar por repetição e sinaliza um novo ID', async () => {
  jest.useFakeTimers();
  const dados = { itens: [alerta], atualizadoEm: instante };
  jest.mocked(lerLocal).mockResolvedValue({ dados, memoria: { 12: true } });
  jest.mocked(guardarLocal).mockResolvedValue();
  jest
    .mocked(carregarPainel)
    .mockRejectedValueOnce(new ErroApi('offline', 'Sem conexão'))
    .mockResolvedValueOnce(dados)
    .mockResolvedValueOnce({ ...dados, itens: [alerta, { ...alerta, id: 13 }] });
  const { result, unmount } = renderHook(useMonitor);
  await act(async () => {});
  expect(result.current.estado).toBe('offline');
  expect(result.current.snapshot).toEqual(dados);
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(result.current.estado).toBe('online');
  expect(emitir).not.toHaveBeenCalled();
  await act(async () => {
    result.current.atualizar();
  });
  expect(result.current.aviso?.id).toBe(13);
  expect(emitir).toHaveBeenCalledTimes(1);
  unmount();
});
test('não sobrepõe requisições quando há várias tentativas manuais', async () => {
  jest.useFakeTimers();
  jest.mocked(lerLocal).mockResolvedValue(null);
  let liberar!: () => void;
  jest.mocked(carregarPainel).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        liberar = () => resolve({ itens: [], atualizadoEm: instante });
      }),
  );
  const { result, unmount } = renderHook(useMonitor);
  await act(async () => {});
  await act(async () => {
    result.current.atualizar();
    result.current.atualizar();
    jest.advanceTimersByTime(6000);
  });
  expect(carregarPainel).toHaveBeenCalledTimes(1);
  await act(async () => {
    liberar();
  });
  expect(result.current.estado).toBe('online');
  unmount();
});
