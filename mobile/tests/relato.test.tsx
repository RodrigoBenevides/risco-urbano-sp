import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { enviarRelato } from '../src/api';
import { Relato } from '../src/Relato';
import { guardarLocal, lerLocal, removerRascunho } from '../src/storage';
import { rascunho } from './cenarios';

jest.mock('../src/api', () => ({ enviarRelato: jest.fn() }));
jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  lerLocal: jest.fn(),
  guardarLocal: jest.fn(),
  removerRascunho: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@expo/vector-icons/Feather', () => 'Feather');
jest.mock('expo-crypto', () => ({ randomUUID: () => '8fd1846d-7a6c-4991-823e-7009d20338b3' }));

test('restaura rascunho, confirma o envio após falha e abre o ID devolvido', async () => {
  jest.mocked(lerLocal).mockResolvedValue(rascunho);
  jest.mocked(guardarLocal).mockResolvedValue();
  jest.mocked(removerRascunho).mockResolvedValue();
  jest
    .mocked(enviarRelato)
    .mockRejectedValueOnce(new Error('Sem conexão'))
    .mockResolvedValueOnce({ id: 45, alertaId: 22 });
  const aoEnviar = jest.fn(),
    abrirId = jest.fn();
  render(<Relato aoEnviar={aoEnviar} abrirId={abrirId} />);
  fireEvent.press(await screen.findByTestId('revisar-relato'));
  expect(screen.getByText('60 min sem energia')).toBeTruthy();
  fireEvent.press(screen.getByTestId('enviar-relato'));
  expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
  expect(aoEnviar).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('enviar-relato'));
  fireEvent.press(await screen.findByTestId('ver-relato-enviado'));
  expect(abrirId).toHaveBeenCalledWith(22);
  expect(jest.mocked(enviarRelato).mock.calls.map((c) => c[0].chave)).toEqual([
    rascunho.chave,
    rascunho.chave,
  ]);
  await waitFor(() => expect(removerRascunho).toHaveBeenCalledWith(rascunho.chave));
});
