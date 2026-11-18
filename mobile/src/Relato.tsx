import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { enviarRelato } from './api';
import { bairros, Draft, erroRelato, nomeTipo, tipos } from './domain';
import { ehRascunho, guardarLocal, lerLocal, removerRascunho } from './storage';
import { Button, C, Icon, Option, Page, S, T } from './ui';

const novo = (): Draft => ({
  chave: randomUUID(),
  bairro: 'Vila Mariana',
  tipo: 'ENERGIA',
  duracao: '',
});
export function Relato({ aoEnviar, abrirId }: { aoEnviar: () => void; abrirId: (n: number) => void }) {
  const [draft, setDraft] = useState<Draft | null>(null),
    [revisar, setRevisar] = useState(false),
    [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false),
    [salvo, setSalvo] = useState<{ id: number; alertaId: number } | null>(null);
  const vivo = useRef(true),
    emCurso = useRef(false);
  useEffect(() => {
    vivo.current = true;
    void lerLocal('rascunho').then((v) => {
      if (vivo.current) setDraft(ehRascunho(v) ? v : novo());
    });
    return () => {
      vivo.current = false;
    };
  }, []);
  function mudar(p: Partial<Draft>) {
    if (!draft || emCurso.current) return;
    if (Object.entries(p).every(([k, v]) => draft[k as keyof Draft] === v)) return;
    const novoD = { ...draft, ...p, chave: randomUUID() };
    setDraft(novoD);
    setErro('');
    void guardarLocal('rascunho', novoD).catch(() => {
      if (vivo.current)
        setErro('O armazenamento local está indisponível. Mantenha o formulário aberto.');
    });
  }
  async function enviar() {
    if (!draft || emCurso.current) return;
    emCurso.current = true;
    setEnviando(true);
    setErro('');
    try {
      await guardarLocal('rascunho', draft);
      const r = await enviarRelato(draft);
      aoEnviar();
      if (vivo.current) {
        setSalvo(r);
        setRevisar(false);
      }
      await removerRascunho(draft.chave);
    } catch (e) {
      if (vivo.current)
        setErro(
          (e instanceof Error ? e.message : 'Falha no envio.') +
            ' O envio pode ser repetido com a mesma chave.',
        );
    } finally {
      emCurso.current = false;
      if (vivo.current) setEnviando(false);
    }
  }
  if (salvo)
    return (
      <Page id="relato-confirmado">
        <Icon name="check-circle" size={36} color={C.sea} />
        <T weight="bold" style={S.title}>
          Relato registrado
        </T>
        <T style={S.desc}>
          Observação #{salvo.id} vinculada ao alerta #{salvo.alertaId}.
        </T>
        <Button testID="ver-relato-enviado" onPress={() => abrirId(salvo.alertaId)}>
          Ver alerta relacionado
        </Button>
        <Button
          secondary
          onPress={() => {
            setSalvo(null);
            setDraft(novo());
            setErro('');
          }}
        >
          Registrar outro relato
        </Button>
      </Page>
    );
  return (
    <Page id="relato">
      <T weight="bold" style={S.title} accessibilityRole="header">
        {revisar ? 'Revisar ocorrência' : 'Registrar ocorrência'}
      </T>
      <T style={S.desc}>
        {revisar
          ? 'Confira os dados antes de enviar.'
          : 'Informe o que observou no seu bairro. O relato é anônimo.'}
      </T>
      {draft &&
        (revisar ? (
          <View style={S.box}>
            <T weight="bold" style={S.h3}>
              {nomeTipo[draft.tipo]}
            </T>
            <T>{draft.bairro}</T>
            {draft.tipo === 'ENERGIA' && <T>{draft.duracao} min sem energia</T>}
            <T style={S.small}>Fonte comunitária · sem confirmação independente</T>
          </View>
        ) : (
          <>
            <View style={S.box}>
              <T weight="bold" style={S.h3}>
                O que aconteceu?
              </T>
              <View style={S.wrap}>
                {tipos.map((t) => (
                  <Option
                    key={t}
                    testID={'relato-tipo-' + t}
                    label={nomeTipo[t]}
                    value={t}
                    atual={draft.tipo}
                    select={() => mudar({ tipo: t })}
                  />
                ))}
              </View>
            </View>
            <View style={S.box}>
              <T weight="bold" style={S.h3}>
                Em qual bairro?
              </T>
              <View style={S.wrap}>
                {bairros.map((b) => (
                  <Option
                    key={b}
                    testID={'relato-bairro-' + b}
                    label={b}
                    value={b}
                    atual={draft.bairro}
                    select={() => mudar({ bairro: b })}
                  />
                ))}
              </View>
            </View>
            {draft.tipo === 'ENERGIA' && (
              <View style={S.box}>
                <T weight="bold" style={S.h3}>
                  Há quantos minutos?
                </T>
                <TextInput
                  testID="duracao-minutos"
                  accessibilityLabel="Duração em minutos"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={5}
                  value={draft.duracao}
                  placeholder="Ex.: 30"
                  placeholderTextColor={C.muted}
                  style={{
                    minHeight: 50,
                    paddingHorizontal: 12,
                    backgroundColor: C.bg,
                    color: C.ink,
                    borderWidth: 1,
                    borderColor: C.line,
                    borderRadius: 8,
                    fontSize: 18,
                  }}
                  onChangeText={(v) => mudar({ duracao: v })}
                />
              </View>
            )}
          </>
        ))}
      {!!erro && (
        <T accessibilityRole="alert" style={{ color: '#913618' }}>
          {erro}
        </T>
      )}
      {draft &&
        (revisar ? (
          <>
            <Button testID="enviar-relato" disabled={enviando} icon="send" onPress={enviar}>
              {enviando ? 'Enviando…' : 'Confirmar envio'}
            </Button>
            <Button disabled={enviando} secondary onPress={() => setRevisar(false)}>
              Editar dados
            </Button>
          </>
        ) : (
          <Button
            testID="revisar-relato"
            icon="arrow-right"
            onPress={() => {
              Keyboard.dismiss();
              const msg = erroRelato(draft);
              setErro(msg || '');
              if (!msg) setRevisar(true);
            }}
          >
            Revisar relato
          </Button>
        ))}
    </Page>
  );
}
