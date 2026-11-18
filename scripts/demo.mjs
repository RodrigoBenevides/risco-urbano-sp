import { randomUUID } from 'node:crypto';

const base = (process.env.API_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const [acao = 'saude', argumento] = process.argv.slice(2);

async function requisitar(caminho, corpo) {
  const resposta = await fetch(base + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: corpo ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  const texto = await resposta.text();
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${caminho}: ${texto}`);
  return JSON.parse(texto);
}

async function executar() {
  if (acao === 'saude') return requisitar('/actuator/health');
  if (acao === 'historico') return requisitar('/api/observacoes?origem=PUBLICA&size=5');
  if (acao === 'lista') return requisitar('/api/alertas?size=10');
  if (!['agua', 'calor'].includes(acao)) {
    throw new Error('Use saude, lista, historico, agua [cm] ou calor [°C na zona urbana]. Use ponto para decimais.');
  }
  const agua = acao === 'agua';
  const valor = argumento === undefined ? (agua ? 22 : 35) : Number(argumento);
  if (!Number.isFinite(valor)) throw new Error('Informe uma medida numérica.');
  const instante = new Date().toISOString();
  const medicao = {
    chave: randomUUID(),
    bairro: agua ? 'Vila Mariana' : 'Saúde',
    tipo: agua ? 'ALAGAMENTO' : 'CALOR',
    unidade: agua ? 'cm' : '°C',
    valor,
    observadoEm: instante,
    ...(!agua && { referencia: 30, referenciaEm: instante }),
  };
  const gravado = await requisitar('/api/demo/sensores', medicao);
  const alerta = await requisitar('/api/alertas/' + encodeURIComponent(gravado.alertaId));
  if (alerta.id !== gravado.alertaId) throw new Error('O ID consultado difere do ID gravado.');
  return { observacaoId: gravado.id, alertaId: alerta.id, bairro: alerta.bairro, prioridade: alerta.prioridade, pontos: alerta.pontos, motivos: alerta.motivos };
}

try {
  console.log(JSON.stringify(await executar(), null, 2));
} catch (erro) {
  console.error('Falha na demonstração:', erro.message, erro.cause?.code ?? '');
  process.exitCode = 1;
}
