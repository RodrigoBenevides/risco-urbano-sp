import type { Alerta, Draft } from '../src/domain';

export const instante = '2026-11-18T21:30:00Z';
export const alerta: Alerta = {
  id: 12,
  tipo: 'ALAGAMENTO',
  bairro: 'Vila Mariana',
  prioridade: 'ALTA',
  pontos: 7,
  impacto: 3,
  observadoEm: instante,
  titulo: 'Lâmina de água de 22 cm',
  motivos: ['Impacto alto', 'Observação recente'],
  ativo: true,
  evidencias: [
    {
      id: 17,
      origem: 'SENSOR',
      fonte: 'Sensor A',
      confianca: 'MEDIA',
      motivoConfianca: 'Sensor simulado identificado',
      observadoEm: instante,
      descricao: '22 cm de água',
    },
  ],
};
export const rascunho: Draft = {
  chave: '36260dbe-cf46-49f7-a122-6bc3661058b1',
  tipo: 'ENERGIA',
  bairro: 'Moema',
  duracao: '60',
};
