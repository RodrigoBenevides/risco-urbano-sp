import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { carregarAlerta, ehAlerta } from './src/api';
import { guardarLocal, lerLocal } from './src/storage';
import { Alerta, Filtros, horario, nomeTipo, quando, semFiltros } from './src/domain';
import { Lista } from './src/Lista';
import { Conexao, Painel } from './src/Painel';
import { useMonitor } from './src/monitor';
import { observarToques, pedirPermissao, permissao, Permissao } from './src/notificacoes';
import { Button, C, Empty, Fonte, Fontes, Icon, Icone, Page, Pill, S, T, Tap } from './src/ui';
import { Relato } from './src/Relato';
import { Arquivo } from './src/Arquivo';

type Aba = 'painel' | 'lista' | 'historico' | 'relato';
const abas: { id: Aba; icone: Icone; nome: string }[] = [
  { id: 'painel', icone: 'activity', nome: 'Painel' },
  { id: 'lista', icone: 'layers', nome: 'Alertas' },
  { id: 'historico', icone: 'archive', nome: 'Histórico' },
  { id: 'relato', icone: 'edit-3', nome: 'Relatar' },
];
export default function App() {
  const [fonts] = useFonts({ Barlow_400Regular, Barlow_500Medium, Barlow_700Bold });
  return (
    <SafeAreaProvider>
      <Fontes.Provider value={fonts}>
        <Principal />
      </Fontes.Provider>
    </SafeAreaProvider>
  );
}
function Principal() {
  const m = useMonitor();
  const [aba, setAba] = useState<Aba>('painel'),
    [id, setId] = useState<number | null>(null),
    [fallback, setFallback] = useState<Alerta | null>(null);
  const [erroDetalhe, setErroDetalhe] = useState(''),
    [tentativa, setTentativa] = useState(0),
    [filtros, setFiltros] = useState<Filtros>(semFiltros);
  const [perm, setPerm] = useState<Permissao>('indisponivel'),
    [config, setConfig] = useState(false);
  const [erroPermissao, setErroPermissao] = useState('');
  const voltar = useCallback(() => {
    setId(null);
    setFallback(null);
    setErroDetalhe('');
  }, []);
  const navegar = (a: Aba) => {
    voltar();
    setConfig(false);
    setAba(a);
  };
  const abrirId = useCallback((n: number) => {
    setFallback(null);
    setErroDetalhe('');
    setId(n);
    setConfig(false);
  }, []);
  const abrir = (a: Alerta) => {
    abrirId(a.id);
    setFallback(a);
  };
  const dadoAtual = m.snapshot?.itens.find((a) => a.id === id);
  const anterior = fallback?.id === id ? fallback : null;
  const detalhe = dadoAtual
    ? {
        ...dadoAtual,
        evidencias: [
          ...new Map(
            [...(anterior?.evidencias || []), ...dadoAtual.evidencias].map((e) => [e.id, e]),
          ).values(),
        ],
      }
    : anterior;
  const versao = dadoAtual?.evidencias.map((e) => e.id).join(',');
  useEffect(() => {
    if (id === null) return;
    let ativo = true;
    const chave = 'detalhe-' + id;
    void (async () => {
      const salvo = await lerLocal(chave);
      if (!ativo) return;
      if (ehAlerta(salvo) && salvo.id === id) setFallback(salvo);
      try {
        const a = await carregarAlerta(id);
        if (ativo) {
          setFallback(a);
          setErroDetalhe('');
          void guardarLocal(chave, a).catch(() => {});
        }
      } catch (e) {
        if (ativo) setErroDetalhe(e instanceof Error ? e.message : 'Detalhe indisponível.');
      }
    })();
    return () => {
      ativo = false;
    };
  }, [id, versao, tentativa, m.estado]);
  useEffect(() => observarToques(abrirId), [abrirId]);
  useEffect(() => {
    const ler = () => {
      permissao()
        .then(setPerm)
        .catch(() => setPerm('indisponivel'));
    };
    ler();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') ler();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (config) {
        setConfig(false);
        return true;
      }
      if (id !== null) {
        voltar();
        return true;
      }
      if (aba !== 'painel') {
        setAba('painel');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [id, aba, voltar, config]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 690,
          alignSelf: 'center',
          backgroundColor: C.bg,
          borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
          borderRightWidth: Platform.OS === 'web' ? 1 : 0,
          borderColor: C.line,
        }}
      >
        <View
          style={[
            S.between,
            { paddingHorizontal: 18, paddingVertical: 6, backgroundColor: C.white, minHeight: 63 },
          ]}
        >
          <Tap label="Ir ao painel" onPress={() => navegar('painel')} style={S.row}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: C.sea,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="activity" size={24} color={C.white} />
            </View>
            <View>
              <T weight="bold" style={{ fontSize: 20, lineHeight: 24, letterSpacing: -0.5 }}>
                Risco Urbano SP
              </T>
              <T style={S.small}>São Paulo · SP</T>
            </View>
          </Tap>
          <Tap
            label="Preferências de alertas"
            testID="preferencias-alertas"
            onPress={() => setConfig(!config)}
            style={{ width: 48, alignItems: 'center' }}
          >
            <Icon name="bell" color={C.sea} />
          </Tap>
        </View>
        <Conexao
          estado={m.estado}
          atualizado={m.snapshot ? horario(m.snapshot.atualizadoEm) : ''}
          atualizar={m.atualizar}
        />
        {m.falhaCache && (
          <T accessibilityLiveRegion="polite" style={{ padding: 8, color: '#793E09' }}>
            Armazenamento indisponível. A cópia local pode estar desatualizada.
          </T>
        )}
        {config ? (
          <Page id="notificacoes">
            <T weight="bold" style={S.title}>
              Notificações
            </T>
            <View style={S.box}>
              <T weight="bold" style={S.h3}>
                Alertas de prioridade alta
              </T>
              <T style={S.desc}>
                Com o aplicativo em uso, novos alertas de prioridade alta e mudanças para alta aparecem
                no painel.
              </T>
              <T style={S.desc}>
                {perm === 'indisponivel'
                  ? 'Neste ambiente, os avisos aparecem dentro do aplicativo.'
                  : perm === 'concedida'
                    ? 'As notificações locais estão permitidas neste dispositivo.'
                    : perm === 'negada'
                      ? 'Permissão negada. Você pode habilitá-la nos ajustes de notificações do Android.'
                      : 'Autorize a exibição dos alertas na bandeja do Android.'}
              </T>
              {!!erroPermissao && <T accessibilityRole="alert" style={S.small}>{erroPermissao}</T>}
              {(perm === 'pendente' || perm === 'negada') && (
                <Button
                  testID="permitir-notificacoes"
                  icon="bell"
                  onPress={() => {
                    setErroPermissao('');
                    pedirPermissao().then(setPerm).catch((e: Error) => {
                      setErroPermissao('Não foi possível abrir a permissão. Tente novamente ou use os ajustes do Android.');
                      if (__DEV__) console.warn('Permissão Android:', e.message);
                    });
                  }}
                >
                  Permitir notificações
                </Button>
              )}
            </View>
            <Button secondary onPress={() => setConfig(false)}>
              Voltar
            </Button>
          </Page>
        ) : (
          <>
            {!!m.aviso && (
              <View style={[S.between, { backgroundColor: '#FBE6DA', paddingHorizontal: 15 }]}>
                <Tap
                  testID="abrir-aviso"
                  onPress={() => {
                    abrir(m.aviso!);
                    m.setAviso(null);
                  }}
                  style={{ flex: 1 }}
                >
                  <T weight="bold" style={{ color: '#81301D' }}>
                    Prioridade alta · {m.aviso.bairro}
                  </T>
                  <T style={S.small}>
                    {nomeTipo[m.aviso.tipo]} · abrir alerta #{m.aviso.id}
                  </T>
                </Tap>
                <Tap
                  label="Dispensar aviso"
                  onPress={() => m.setAviso(null)}
                  style={{ width: 48, alignItems: 'center' }}
                >
                  <Icon name="x" size={18} />
                </Tap>
              </View>
            )}
            {id !== null ? (
              <Page id="detalhe">
                <Tap
                  onPress={voltar}
                  testID="voltar-detalhe"
                  style={[S.row, { alignSelf: 'flex-start' }]}
                >
                  <Icon name="arrow-left" color={C.sea} />
                  <T weight="bold" style={{ color: C.sea }}>
                    Voltar
                  </T>
                </Tap>
                {detalhe ? (
                  <>
                    <View style={S.wrap}>
                      <Pill nivel={detalhe.prioridade} />
                      <T style={S.small} testID="detalhe-id">
                        Alerta #{detalhe.id}
                      </T>
                    </View>
                    <T weight="bold" style={S.title} accessibilityRole="header">
                      {nomeTipo[detalhe.tipo]}
                    </T>
                    <T style={S.desc}>
                      {detalhe.bairro} · {quando(detalhe.observadoEm)}
                    </T>
                    <T weight="medium">{detalhe.titulo}</T>
                    {!dadoAtual && (detalhe.ativo === false || !!erroDetalhe) && (
                      <T style={S.small}>
                        {detalhe.ativo === false
                          ? 'Alerta fora da janela ativa.'
                          : 'Último detalhe disponível no dispositivo.'}
                      </T>
                    )}
                    <View style={S.box}>
                      <T weight="bold" style={S.h3}>
                        Por que tem essa prioridade?
                      </T>
                      <T weight="bold">
                        Impacto {detalhe.impacto}/3 · {detalhe.pontos} pontos
                      </T>
                      {detalhe.motivos.map((motivo, i) => (
                        <T key={i} style={S.desc}>
                          {motivo}
                        </T>
                      ))}
                    </View>
                    <T weight="bold" style={S.h2} accessibilityRole="header">
                      Evidências
                    </T>
                    {[...detalhe.evidencias]
                      .sort(
                        (a, b) => Date.parse(b.observadoEm) - Date.parse(a.observadoEm) || b.id - a.id,
                      )
                      .map((e) => (
                        <Fonte key={e.id} dado={e} />
                      ))}
                  </>
                ) : erroDetalhe ? (
                  <>
                    <Empty titulo="Detalhe indisponível" texto={erroDetalhe} icon="wifi-off" />
                    <Button secondary onPress={() => setTentativa((p) => p + 1)}>
                      Tentar novamente
                    </Button>
                  </>
                ) : (
                  <ActivityIndicator accessibilityLabel="Carregando alerta" color={C.sea} />
                )}
              </Page>
            ) : aba === 'painel' ? (
              <Painel
                dados={m.snapshot}
                abrir={abrir}
                lista={() => {
                  setFiltros(semFiltros);
                  navegar('lista');
                }}
                escolher={(n) => {
                  setFiltros({ ...semFiltros, prioridade: n });
                  navegar('lista');
                }}
                falhou={!['online', 'carregando'].includes(m.estado)}
                carregando={m.estado === 'carregando'}
              />
            ) : aba === 'lista' ? (
              <Lista
                itens={m.snapshot?.itens || []}
                temDados={!!m.snapshot}
                filtros={filtros}
                mudar={setFiltros}
                abrir={abrir}
              />
            ) : aba === 'historico' ? (
              <Arquivo estado={m.estado} />
            ) : (
              <Relato aoEnviar={m.atualizar} abrirId={abrirId} />
            )}
          </>
        )}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: C.white,
            borderTopWidth: 1,
            borderColor: C.line,
          }}
        >
          {abas.map((a) => {
            const atual = aba === a.id && !config;
            return (
              <Tap
                key={a.id}
                testID={'abrir-' + a.id}
                selected={atual}
                onPress={() => navegar(a.id)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingTop: 8,
                  paddingBottom: 7,
                  borderTopWidth: 3,
                  borderColor: atual ? C.sea : 'transparent',
                  gap: 4,
                }}
              >
                <Icon name={a.icone} color={atual ? C.sea : C.secondary} size={20} />
                <T
                  weight={atual ? 'bold' : 'medium'}
                  style={{ fontSize: 13, color: atual ? C.sea : C.secondary }}
                >
                  {a.nome}
                </T>
              </Tap>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
