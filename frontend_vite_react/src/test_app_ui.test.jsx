import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

function getBoardButtons() {
  const board = screen.getByRole('grid');
  // Cells are <button> inside the grid
  return within(board).getAllByRole('button');
}

describe('Minesweeper App UI', () => {
  test('renders initial HUD and status "Listo"', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /buscaminas/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Estado del juego')).toBeInTheDocument();

    // Status pill should show formatted status
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Listo')).toBeInTheDocument();

    // Preset select exists
    expect(screen.getByLabelText('Seleccionar tamaño de tablero')).toBeInTheDocument();
    // Restart button exists
    expect(screen.getByRole('button', { name: 'Reiniciar' })).toBeInTheDocument();
  });

  test('left click reveals a cell; status becomes "En juego"', async () => {
    // Make mines placement deterministic: always 0 so mines appear early in "available" after shuffle.
    // This avoids flaky tests, but does not assume a specific cell is a mine.
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<App />);

    const cells = getBoardButtons();
    // First click should reveal and place mines safely.
    await userEvent.click(cells[0]);

    // One of the cells should now be revealed (aria-label changes from "Oculto" to something revealed).
    const labels = getBoardButtons().map((b) => b.getAttribute('aria-label'));
    expect(labels.some((l) => l !== 'Oculto' && l !== 'Bandera')).toBe(true);

    // Status should move from ready to playing (after first reveal mines are placed).
    expect(screen.getByText('En juego')).toBeInTheDocument();

    Math.random.mockRestore();
  });

  test('right click toggles a flag and updates HUD "Banderas"', () => {
    render(<App />);

    const cells = getBoardButtons();
    const target = cells[0];

    // HUD flags value is the numeric next to "Banderas"
    const hud = screen.getByLabelText('Estado del juego');
    const flagsBlock = within(hud).getByText('Banderas').closest('.hud-item');
    expect(flagsBlock).toBeTruthy();
    expect(within(flagsBlock).getByText('0')).toBeInTheDocument();

    fireEvent.contextMenu(target);

    // Cell should now be flagged (aria label)
    expect(target).toHaveAttribute('aria-label', 'Bandera');
    // HUD should increment
    expect(within(flagsBlock).getByText('1')).toBeInTheDocument();

    // Toggle off
    fireEvent.contextMenu(target);
    expect(target).toHaveAttribute('aria-label', 'Oculto');
    expect(within(flagsBlock).getByText('0')).toBeInTheDocument();
  });

  test('keyboard: Enter reveals; "f" toggles flag', async () => {
    render(<App />);
    const user = userEvent.setup();

    const cells = getBoardButtons();
    const target = cells[0];

    target.focus();
    expect(target).toHaveFocus();

    await user.keyboard('f');
    expect(target).toHaveAttribute('aria-label', 'Bandera');

    await user.keyboard('f');
    expect(target).toHaveAttribute('aria-label', 'Oculto');

    await user.keyboard('{Enter}');
    // After reveal, aria-label should be Mina/Vacío/Número X (anything but Oculto/Bandera)
    expect(['Oculto', 'Bandera']).not.toContain(target.getAttribute('aria-label'));
  });

  test('reset button restarts the game (removes flags and returns to "Listo")', async () => {
    render(<App />);

    const cells = getBoardButtons();
    fireEvent.contextMenu(cells[0]);
    expect(cells[0]).toHaveAttribute('aria-label', 'Bandera');

    // Click reset
    await userEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));

    // Board should be reset: the previously flagged cell is re-rendered back to hidden.
    const newCells = getBoardButtons();
    expect(newCells[0]).toHaveAttribute('aria-label', 'Oculto');

    // Status should go back to ready
    expect(screen.getByText('Listo')).toBeInTheDocument();
  });

  test('changing preset resets the game and updates board dimensions (rowcount/colcount)', async () => {
    render(<App />);
    const user = userEvent.setup();

    const board = screen.getByRole('grid');
    expect(board).toHaveAttribute('aria-rowcount', '9');
    expect(board).toHaveAttribute('aria-colcount', '9');

    const select = screen.getByLabelText('Seleccionar tamaño de tablero');
    await user.selectOptions(select, 'medium');

    // After preset change, board updates
    const boardAfter = screen.getByRole('grid');
    expect(boardAfter).toHaveAttribute('aria-rowcount', '16');
    expect(boardAfter).toHaveAttribute('aria-colcount', '16');

    // And status resets to ready
    expect(screen.getByText('Listo')).toBeInTheDocument();
  });
});
