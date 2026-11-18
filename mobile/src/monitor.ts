import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { carregarPainel, ehSnapshot, ErroApi, Falha } from './api';
import { Alerta, MemoriaAltas, Snapshot, transicoesAltas } from './domain';
import { guardarLocal, lerLocal } from './storage';
import { emitir } from './notificacoes';

export function useMonitor() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'online' | Falha>('carregando');
  const [aviso, setAviso] = useState<Alerta | null>(null);
  const [falhaCache, setFalhaCache] = useState(false);
  const executar = useRef<() => void>(() => {});
  const atualizar = useCallback(() => executar.current(), []);
  useEffect(() => {
    let vivo = true, pronto = false, emCurso = false, ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined, memoria: MemoriaAltas | null = null;
    const agendar = () => { if (vivo && ativo) timer = setTimeout(ciclo, 3000); };
    async function ciclo() {
      if (!vivo || !pronto || emCurso || !ativo) return;
      clearTimeout(timer);
      emCurso = true;
      try {
        const dados = await carregarPainel();
        if (!vivo || !ativo) return;
        const t = transicoesAltas(memoria, dados.itens);
        memoria = t.memoria;
        setSnapshot(dados); setEstado('online');
        try { await guardarLocal('painel', { dados, memoria }); if (vivo) setFalhaCache(false); }
        catch { if (vivo) setFalhaCache(true); }
        if (vivo && ativo && t.novas.length) {
          setAviso(t.novas[0]);
          for (const alerta of t.novas) await emitir(alerta).catch(() => {});
        }
      } catch (e) { if (vivo && ativo) setEstado(e instanceof ErroApi ? e.tipo : 'servico'); }
      finally { emCurso = false; agendar(); }
    }
    executar.current = ciclo;
    const visibilidade = () => Platform.OS === 'web' && typeof document !== 'undefined' ? !document.hidden : AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    function aoMudar() { ativo = visibilidade(); if (ativo) void ciclo(); else clearTimeout(timer); }
    ativo = visibilidade();
    const sub = AppState.addEventListener('change', aoMudar);
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', aoMudar);
    void lerLocal('painel').then((v) => {
      if (!vivo) return;
      const r = v as { dados?: unknown; memoria?: MemoriaAltas } | null;
      if (r && ehSnapshot(r.dados)) {
        setSnapshot(r.dados);
        memoria = r.memoria && Object.values(r.memoria).every(x => typeof x === 'boolean') ? r.memoria : transicoesAltas(null, r.dados.itens).memoria;
      }
      pronto = true; void ciclo();
    });
    return () => {
      vivo = false; clearTimeout(timer); sub.remove(); executar.current = () => {};
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', aoMudar);
    };
  }, []);
  return { snapshot, estado, aviso, setAviso, atualizar, falhaCache };
}
