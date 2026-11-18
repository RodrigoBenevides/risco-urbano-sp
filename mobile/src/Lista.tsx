import React,{useState} from 'react';
import { View } from 'react-native';
import { Alerta,bairros,filtrar,Filtros,nomeNivel,nomeTipo,prioridades,semFiltros,tipos } from './domain';
import { Button,Card,Empty,Icon,Option,Page,S,T,Tap,C } from './ui';

export function Lista({itens, filtros, mudar, abrir, temDados}: {itens:Alerta[];filtros:Filtros;mudar:(f:Filtros)=>void;abrir:(a:Alerta)=>void;temDados:boolean}) {
  const [expandir,setExpandir]=useState(false);
  const [limite,setLimite]=useState(20);
  const resultado=filtrar(itens,filtros);
  const grupos: {chave:keyof Filtros;nome:string;opcoes:[string,string][]}[]=[
    {chave:'tipo',nome:'Tipo de risco',opcoes:tipos.map(t=>[t,nomeTipo[t]])},
    {chave:'bairro',nome:'Bairro',opcoes:bairros.map(b=>[b,b])},
    {chave:'prioridade',nome:'Prioridade',opcoes:prioridades.map(n=>[n,nomeNivel[n]])}
  ];
  const ativos=grupos.flatMap(g=>g.opcoes.filter(o=>o[0]===filtros[g.chave]).map(o=>o[1]));
  return <Page id="lista"><T weight="bold" accessibilityRole="header" style={S.title}>Alertas ativos</T>
    <Tap testID="abrir-filtros" selected={expandir} onPress={()=>setExpandir(!expandir)} style={[S.box,{paddingVertical:11}]}>
      <View style={S.between}><View style={[S.row,{flex:1}]}><Icon name="sliders" color={C.sea}/><T style={{flexShrink:1}} weight="bold">{ativos.length ? ativos.join(' · ') : 'Filtrar alertas'}</T></View><Icon name={expandir?'chevron-up':'chevron-down'}/></View></Tap>
    {expandir && <View style={S.box}>{grupos.map(g=><View key={g.chave} style={{gap:6}}><T weight="bold">{g.nome}</T><View style={S.wrap}>
      {[['','Todos'],...g.opcoes].map(([v,n])=><Option key={v} testID={'filtro-'+g.chave+'-'+(v||'todos')} label={n} value={v} atual={filtros[g.chave]} select={x=>{mudar({...filtros,[g.chave]:x});setLimite(20);}}/>)}</View></View>)}
      {ativos.length>0 && <Button secondary onPress={()=>mudar(semFiltros)}>Limpar filtros</Button>}</View>}
    <T style={S.small}>{resultado.length} {resultado.length===1?'alerta':'alertas'} · em ordem de prioridade</T>
    {resultado.slice(0,limite).map(a=><Card key={a.id} a={a} abrir={abrir}/>)}
    {resultado.length===0 && <Empty icon="search" titulo={temDados?'Nenhum alerta neste recorte':'Lista ainda indisponível'} texto={temDados?'Experimente outro bairro ou tipo de risco.':'A primeira consulta à API ainda precisa ser concluída.'}/>}
    {resultado.length>limite && <Button secondary onPress={()=>setLimite(limite+20)}>Ver mais alertas</Button>}
  </Page>;
}
