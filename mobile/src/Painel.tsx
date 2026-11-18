import React from 'react';
import { View } from 'react-native';
import { Alerta, Nivel, nomeNivel, prioridades, Snapshot } from './domain';
import { C, Card, Empty, Icon, Page, S, T, Tap, tom } from './ui';

export function Painel({ dados, abrir, lista, escolher, falhou, carregando }: {
  dados: Snapshot | null; abrir:(a:Alerta)=>void; lista:()=>void; escolher:(n:Nivel)=>void; falhou:boolean; carregando:boolean;
}) {
  const itens = dados?.itens || [];
  return <Page id="painel">
    <T weight="bold" style={S.title} accessibilityRole="header">Monitoramento</T>
    <View style={{backgroundColor:'#143F40',borderRadius:18,padding:20,overflow:'hidden',gap:12}}>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{position:'absolute',right:-65,top:-58,width:205,height:205,borderRadius:104,borderWidth:1,borderColor:'#395D57',justifyContent:'center',alignItems:'center'}}>
        <View style={{width:155,height:155,borderRadius:80,borderWidth:1,borderColor:'#395D57',justifyContent:'center',alignItems:'center'}}><View style={{width:100,height:100,borderRadius:50,borderWidth:1,borderColor:'#395D57'}}/></View>
      </View>
      <View style={S.row}><Icon name="radio" size={16} color={C.mint}/><T weight="bold" style={[S.label,{color:C.mint}]}>SITUAÇÃO NOS BAIRROS</T></View>
      <T weight="bold" style={{fontSize:32,lineHeight:36,color:C.white,letterSpacing:-0.7}}>{dados ? itens.length + (itens.length === 1 ? ' alerta ativo' : ' alertas ativos') : 'Aguardando dados'}</T>
      <T style={{color:'#D4E4DC',fontSize:15}}>{dados ? 'Distribuição por prioridade' : 'O painel será preenchido na primeira sincronização.'}</T>
      {dados && <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>{prioridades.map(n =>
        <Tap key={n} testID={'resumo-'+n} label={'Ver alertas de prioridade '+nomeNivel[n]} onPress={()=>escolher(n)} style={{flexGrow:1,minWidth:72,borderRadius:9,backgroundColor:'#244C49',paddingHorizontal:10,paddingVertical:8,gap:1}}>
          <T weight="bold" style={{fontSize:22,color:C.white}}>{itens.filter(a=>a.prioridade===n).length}</T>
          <T weight="medium" style={{fontSize:13,color:n==='ALTA'?'#FFC7AD':n==='MEDIA'?'#FFDEA6':C.mint}}>{nomeNivel[n]}</T></Tap>)}</View>}
    </View>
    <View style={S.between}><T weight="bold" style={S.h2} accessibilityRole="header">Maior prioridade</T>
      <Tap testID="ver-todos" onPress={lista} style={S.row}><T weight="bold" style={{color:C.sea}}>Ver lista</T><Icon name="arrow-right" size={15} color={C.sea}/></Tap></View>
    {itens[0] ? <Card a={itens[0]} abrir={abrir} index={0}/> : <Empty titulo={dados ? 'Nenhum alerta ativo' : carregando ? 'Consultando o servidor' : 'Sem dados salvos'} texto={dados ? 'Novas ocorrências aparecem aqui assim que são recebidas.' : falhou ? 'Tente novamente quando o serviço estiver disponível.' : 'Buscando as ocorrências dos bairros monitorados.'} icon={falhou?'wifi-off':'activity'}/>}
    {itens.length > 1 && <><T weight="bold" style={[S.h2,{marginTop:7}]} accessibilityRole="header">Outros alertas</T>{itens.slice(1,4).map(a=><Card key={a.id} a={a} abrir={abrir}/>)}</>}
  </Page>;
}

export function Conexao({ estado, atualizado, atualizar }: {estado:string;atualizado:string;atualizar:()=>void}) {
  const online=estado==='online', espera=estado==='carregando', cor= online ? C.sea : espera?C.secondary:tom.MEDIA.fg;
  const nome:Record<string,string>={online:'Conectado',carregando:'Sincronizando',offline:'Sem conexão com o servidor',servico:'Serviço indisponível',dados:'Resposta inválida da API'};
  return <View style={[S.between,{paddingHorizontal:18,paddingVertical:4,minHeight:44,borderBottomWidth:1,borderColor:C.line,backgroundColor:online?C.pale:espera?C.bg:'#FFF3DA'}]}>
    <View style={[S.row,{flex:1,gap:7,flexWrap:'wrap'}]}><Icon name={online?'wifi':espera?'refresh-cw':'wifi-off'} size={15} color={cor}/>
      <T testID="status-conexao" weight="bold" style={{color:cor,fontSize:14}}>{nome[estado]}</T>
      {!!atualizado && <T style={S.small}>Última atualização {atualizado}</T>}</View>
    {!espera && !online && <Tap testID="tentar-novamente" label="Tentar novamente" onPress={atualizar} style={{paddingHorizontal:6}}><Icon name="rotate-cw" color={cor}/></Tap>}
  </View>;
}
