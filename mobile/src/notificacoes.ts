import * as N from 'expo-notifications';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { Alerta, nomeTipo } from './domain';

export type Permissao = 'concedida' | 'pendente' | 'negada' | 'indisponivel';
const canal = 'alertas-urbanos';
N.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
export async function permissao(): Promise<Permissao> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const concedida = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return concedida ? 'concedida' : 'pendente';
  }
  const p = await N.getPermissionsAsync();
  return p.granted ? 'concedida' : p.status === 'denied' ? 'negada' : 'pendente';
}
export async function pedirPermissao(): Promise<Permissao> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const resposta = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (resposta === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) await Linking.openSettings();
    return resposta === PermissionsAndroid.RESULTS.GRANTED ? 'concedida' : 'negada';
  }
  await N.setNotificationChannelAsync(canal, {
    name: 'Riscos de prioridade alta',
    importance: N.AndroidImportance.HIGH,
  });
  const atual = await N.getPermissionsAsync();
  if (!atual.granted && !atual.canAskAgain) {
    await Linking.openSettings();
    return 'negada';
  }
  await N.requestPermissionsAsync();
  return permissao();
}
export async function emitir(a: Alerta) {
  if ((await permissao()) !== 'concedida') return;
  await N.setNotificationChannelAsync(canal, {
    name: 'Riscos de prioridade alta',
    importance: N.AndroidImportance.HIGH,
  });
  await N.scheduleNotificationAsync({
    identifier: 'alerta-' + a.id,
    content: {
      title: 'Prioridade alta · ' + a.bairro,
      body: nomeTipo[a.tipo] + ' · ' + a.titulo,
      data: { alertaId: a.id },
    },
    trigger: { channelId: canal },
  });
}
export function observarToques(abrir: (id: number) => void) {
  let ultimo = '';
  function verificar(r: N.NotificationResponse | null) {
    if (!r || r.notification.request.identifier === ultimo) return;
    const id = r.notification.request.content.data?.alertaId;
    if (typeof id === 'number' && Number.isInteger(id)) {
      ultimo = r.notification.request.identifier;
      abrir(id);
      void N.clearLastNotificationResponseAsync().catch(() => {});
      // O mesmo evento pode voltar a alta em outro momento.
      setTimeout(() => {
        ultimo = '';
      }, 1000);
    }
  }
  const s = N.addNotificationResponseReceivedListener(verificar);
  verificar(N.getLastNotificationResponse());
  return () => s.remove();
}
