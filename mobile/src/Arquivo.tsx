import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { carregarHistorico, ehHistorico } from './api';
import { Historico } from './domain';
import { guardarLocal, lerLocal } from './storage';
import { Button, C, Empty, Fonte, Page, S, T } from './ui';

export function Arquivo({ estado }: { estado: string }) {
  const [dados, setDados] = useState<Historico[] | null>(null),
    [erro, setErro] = useState(''),
    [ciclo, setCiclo] = useState(0);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const cache = await lerLocal('historico');
      if (!vivo) return;
      if (Array.isArray(cache) && cache.every(ehHistorico)) setDados(cache);
      try {
        const itens = await carregarHistorico();
        if (!vivo) return;
        setDados(itens);
        setErro('');
        await guardarLocal('historico', itens);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : 'Falha na consulta ao histórico.');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [ciclo, estado]);
  return (
    <Page id="historico">
      <T weight="bold" style={S.title} accessibilityRole="header">
        Histórico público
      </T>
      <T style={S.desc}>
        Observações meteorológicas da estação de Congonhas, em São Paulo. Consulte a data de cada
        leitura.
      </T>
      {!!erro && (
        <>
          <T style={S.small}>
            {dados ? 'Exibindo a cópia local. ' : ''}
            {erro}
          </T>
          <Button secondary onPress={() => setCiclo((c) => c + 1)}>
            Tentar novamente
          </Button>
        </>
      )}
      {dados === null && !erro && (
        <ActivityIndicator color={C.sea} accessibilityLabel="Carregando histórico" />
      )}
      {dados?.length === 0 && (
        <Empty
          titulo="Nenhuma leitura importada"
          texto="Os registros aparecem após a importação da base pública."
          icon="archive"
        />
      )}
      {dados?.map((d) => (
        <Fonte key={d.id} dado={d} />
      ))}
    </Page>
  );
}
