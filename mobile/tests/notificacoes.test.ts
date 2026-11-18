import * as N from 'expo-notifications';
import { emitir, observarToques } from '../src/notificacoes';
import { alerta } from './cenarios';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn(),
}));
afterEach(() => jest.clearAllMocks());
test('respeita recusa e envia notificação ao canal com ID do alerta quando autorizada', async () => {
  const p = jest.mocked(N.getPermissionsAsync);
  p.mockResolvedValueOnce({ granted: false, status: 'denied' } as N.NotificationPermissionsStatus);
  await emitir(alerta);
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  p.mockResolvedValueOnce({ granted: true } as N.NotificationPermissionsStatus);
  await emitir(alerta);
  expect(N.scheduleNotificationAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      content: expect.objectContaining({ data: { alertaId: 12 } }),
      trigger: { channelId: 'alertas-urbanos' },
    }),
  );
});
test('um toque no aviso nativo abre o alerta correto uma vez e remove o listener ao sair', () => {
  const r: N.NotificationResponse = {
    actionIdentifier: 'DEFAULT',
    notification: {
      date: Date.now(),
      request: {
        identifier: 'alerta-12',
        trigger: { channelId: 'alertas-urbanos' },
        content: {
          title: 'Prioridade alta',
          body: 'Alagamento',
          subtitle: null,
          sound: null,
          categoryIdentifier: null,
          data: { alertaId: 12 },
        },
      },
    },
  };
  const remove = jest.fn();
  jest.mocked(N.addNotificationResponseReceivedListener).mockReturnValue({ remove });
  jest.mocked(N.getLastNotificationResponse).mockReturnValue(r);
  jest.mocked(N.clearLastNotificationResponseAsync).mockResolvedValue();
  const abrir = jest.fn();
  const fechar = observarToques(abrir);
  jest.mocked(N.addNotificationResponseReceivedListener).mock.calls[0][0](r);
  expect(abrir).toHaveBeenCalledTimes(1);
  expect(abrir).toHaveBeenCalledWith(12);
  fechar();
  expect(remove).toHaveBeenCalledTimes(1);
});
