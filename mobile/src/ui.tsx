import React, { createContext, PropsWithChildren, useContext } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Alerta, Evidencia, Nivel, nomeNivel, nomeOrigem, nomeTipo, quando, Tipo } from './domain';

export const C = { ink: '#122D32', secondary: '#446065', muted: '#4D6568', line: '#C7D5D0', sea: '#006657', mint: '#B4EADA', pale: '#E6F3ED', bg: '#F1F5F2', white: '#FFFFFF' };
export const Fontes = createContext(false);
export function T({ children, style, weight = 'regular', ...props }: TextProps & {weight?: 'regular' | 'medium' | 'bold'}) {
  const loaded = useContext(Fontes);
  return <Text {...props} style={[{ color: C.ink, fontSize: 16, ...(loaded ? {fontFamily: { regular: 'Barlow_400Regular', medium: 'Barlow_500Medium', bold: 'Barlow_700Bold' }[weight]} : {fontWeight: weight === 'bold' ? '700' : weight === 'medium' ? '500' : '400'}) }, style]}>{children}</Text>;
}
export type Icone = React.ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color = C.ink }: {name: Icone; size?: number; color?: string}) {
  return <Feather name={name} size={size} color={color} accessible={false} importantForAccessibility="no" />;
}
export const riscoIcon: Record<Tipo, Icone> = { ALAGAMENTO: 'droplet', CALOR: 'sun', ENERGIA: 'zap' };
export const tom = { ALTA: { fg: '#9C331B', bg: '#FBE6DA' }, MEDIA: { fg: '#794A07', bg: '#FAEAC9' }, BAIXA: { fg: '#205F53', bg: '#DBEEE4' } };
export const S = StyleSheet.create({
  section: { gap: 12, marginBottom: 22 },
  title: { fontSize: 33, lineHeight: 39, letterSpacing: -1.2 },
  h2: { fontSize: 22, lineHeight: 27, letterSpacing: -0.45 },
  h3: { fontSize: 18, lineHeight: 23 },
  small: { color: C.muted, fontSize: 14, lineHeight: 19 },
  label: { fontSize: 12, letterSpacing: 1.25, color: C.secondary },
  desc: { color: C.secondary, fontSize: 16, lineHeight: 22 },
  box: { backgroundColor: C.white, padding: 16, borderRadius: 14, borderColor: C.line, borderWidth: 1, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }
});
export function Tap({ onPress, testID, label, children, style, disabled = false, selected }: PropsWithChildren<{
  onPress: () => void; testID?: string; label?: string; style?: StyleProp<ViewStyle>; disabled?: boolean; selected?: boolean;
}>) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, ...(selected === undefined ? {} : { selected }) }} testID={testID}
    disabled={disabled} onPress={onPress} style={({pressed}) => [{ minHeight: 48, justifyContent: 'center' }, style, { opacity: disabled ? 0.55 : pressed ? 0.76 : 1 }]}>{children}</Pressable>;
}
export function Button({ children, icon, onPress, testID, secondary, disabled }: PropsWithChildren<{icon?: Icone; onPress: () => void; testID?: string; secondary?: boolean; disabled?: boolean}>) {
  const fg = secondary ? C.sea : C.white;
  return <Tap {...{onPress, testID, disabled}} style={{ alignItems: 'center', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: secondary ? C.white : C.sea, borderColor: secondary ? C.line : C.sea, borderRadius: 10 }}>
    <View style={[S.row, {justifyContent:'center'}]}>{icon && <Icon name={icon} color={fg} size={17}/>}<T weight="bold" style={{color:fg}}>{children}</T></View>
  </Tap>;
}
export function Pill({nivel}: {nivel: Nivel}) { return <View style={[S.row, {alignSelf:'flex-start', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, backgroundColor:tom[nivel].bg}]}>
  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tom[nivel].fg }} /><T weight="bold" style={{fontSize:13,color:tom[nivel].fg}}>Prioridade {nomeNivel[nivel].toLowerCase()}</T></View>; }
export function Card({ a, abrir, index }: { a: Alerta; abrir: (a: Alerta) => void; index?: number }) {
  return <Tap onPress={() => abrir(a)} testID={'alerta-' + a.id} label={nomeTipo[a.tipo] + ', ' + a.bairro + ', prioridade ' + nomeNivel[a.prioridade] + ', alerta ' + a.id}
    style={[S.box, { padding: 15, gap: 9, ...(index === 0 ? { borderLeftWidth: 4, borderLeftColor: tom[a.prioridade].fg } : {}) }]}>
    <View style={S.between}><View style={[S.row,{flexShrink:1}]}><Icon name={riscoIcon[a.tipo]} color={C.sea}/><T weight="bold" style={[S.h3,{flexShrink:1}]}>{nomeTipo[a.tipo]}</T></View><Icon name="chevron-right" color={C.secondary}/></View>
    <View style={S.wrap}><Pill nivel={a.prioridade}/><T weight="medium" style={S.small}>{a.bairro}</T></View>
    <T style={S.small}>{a.titulo}</T>
    <T style={S.small}>Alerta #{a.id} · {quando(a.observadoEm)}</T>
  </Tap>;
}
export function Empty({titulo, texto, icon = 'check-circle'}: {titulo: string; texto: string; icon?: Icone}) {
  return <View style={[S.box,{gap:9}]}><Icon name={icon} color={C.sea}/><T weight="bold" style={S.h3}>{titulo}</T><T style={S.desc}>{texto}</T></View>;
}
export function Option({ label, value, atual, select, testID }: {label:string; value:string; atual:string; select:(s:string)=>void; testID?:string}) {
  const ativa = atual === value;
  return <Tap selected={ativa} testID={testID} onPress={() => select(value)} style={{ borderWidth: 1, borderColor: ativa ? C.sea : C.line, backgroundColor: ativa ? C.sea : C.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
    <T weight={ativa ? 'bold' : 'medium'} style={{color:ativa ? C.white : C.ink, fontSize:15}}>{label}</T></Tap>;
}
export function Fonte({ dado }: {dado:Evidencia}) {
  return <View testID={'observacao-'+dado.id} style={S.box}>
    <View style={S.wrap}><Icon name={dado.origem === 'SENSOR' ? 'cpu' : dado.origem === 'PUBLICA' ? 'archive' : 'users'} color={C.sea} size={17}/>
      <T weight="bold" style={S.h3}>{nomeOrigem[dado.origem]}</T></View>
    <T weight="medium">{dado.descricao}</T><T style={S.small}>{dado.fonte} · {quando(dado.observadoEm)}</T>
    <View style={{borderTopWidth:1,borderColor:C.line,paddingTop:9,gap:3}}><T weight="bold">Confiança {nomeNivel[dado.confianca].toLowerCase()}</T>
      <T style={S.small}>{dado.motivoConfianca}</T></View>
    <T style={S.small}>Observação #{dado.id}</T>
  </View>;
}
export function Page({children, id}: PropsWithChildren<{id: string}>) {
  return <ScrollView testID={id} keyboardShouldPersistTaps="handled" style={{flex:1}} contentContainerStyle={{padding:18, paddingBottom:32, gap:12}}>{children}</ScrollView>;
}
