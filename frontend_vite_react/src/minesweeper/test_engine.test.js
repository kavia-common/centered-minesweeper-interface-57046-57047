import { describe, expect, test } from 'vitest';
import { buildNewGame, countAdjacentMines, revealFromCell } from '../engine.js';

function computeAdjacencyNumbers(game) {
  for (let r = 0; r < game.config.rows; r++) {
    for (let c = 0; c < game.config.cols; c++) {
      const cell = game.grid[r][c];
      cell.adjacentMines = cell.isMine ? 0 : countAdjacentMines(game, r, c);
    }
  }
}

describe('minesweeper engine', () => {
  test('buildNewGame creates correct grid dimensions and initial status', () => {
    const game = buildNewGame({ rows: 3, cols: 4, mines: 2, placeMinesImmediately: false });
    expect(game.config).toEqual({ rows: 3, cols: 4, mines: 2 });
    expect(game.grid).toHaveLength(3);
    expect(game.grid[0]).toHaveLength(4);
    expect(game.status).toBe('ready');
    expect(game.minesPlaced).toBe(false);
    expect(game.flagsCount).toBe(0);
    expect(game.revealedCount).toBe(0);
  });

  test('buildNewGame clamps mines to available cells when safeCell forbids too many positions', () => {
    // 2x2 grid => 4 total cells. With safeCell, the safe cell + its neighbors in-bounds are forbidden.
    // For 2x2, safeCell at (0,0) forbids all 4 cells => available.length = 0 => minesToPlace clamps to 0.
    const game = buildNewGame({
      rows: 2,
      cols: 2,
      mines: 3,
      placeMinesImmediately: true,
      safeCell: { r: 0, c: 0 }
    });

    const mineCount = game.grid.flat().filter((c) => c.isMine).length;
    expect(mineCount).toBe(0);
  });

  test('buildNewGame with safeCell avoids placing a mine on safeCell and its immediate neighbors (when possible)', () => {
    const rows = 5;
    const cols = 5;
    const safeCell = { r: 2, c: 2 };

    const game = buildNewGame({
      rows,
      cols,
      mines: 8,
      placeMinesImmediately: true,
      safeCell
    });

    // Forbidden zone: safeCell and its 8 neighbors
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = safeCell.r + dr;
        const cc = safeCell.c + dc;
        expect(game.grid[rr][cc].isMine).toBe(false);
      }
    }
  });

  test('countAdjacentMines counts mines in the 8-neighborhood', () => {
    const game = buildNewGame({ rows: 3, cols: 3, mines: 0, placeMinesImmediately: false });

    // Place mines at 3 corners around center.
    game.grid[0][0].isMine = true;
    game.grid[0][2].isMine = true;
    game.grid[2][0].isMine = true;

    // Center should see 3 mines.
    expect(countAdjacentMines(game, 1, 1)).toBe(3);

    // Edge cell (0,1) sees mines at (0,0) and (0,2) only.
    expect(countAdjacentMines(game, 0, 1)).toBe(2);

    // Corner (2,2) sees no mines adjacent.
    expect(countAdjacentMines(game, 2, 2)).toBe(0);
  });

  test('revealFromCell flood-fills zero-adjacent area and stops at numbered boundary', () => {
    const game = buildNewGame({ rows: 3, cols: 3, mines: 0, placeMinesImmediately: false });

    // Put a mine at top-right corner. This will create some numbered boundary cells.
    game.grid[0][2].isMine = true;

    computeAdjacencyNumbers(game);

    // Reveal from bottom-left. This should reveal most cells except the mine.
    const revealedDelta = revealFromCell(game, 2, 0);
    expect(revealedDelta).toBeGreaterThan(0);

    // All non-mine cells should become revealed by flood-fill (since a single mine only creates numbers but still connected).
    const nonMineCells = game.grid.flat().filter((c) => !c.isMine);
    expect(nonMineCells.every((c) => c.isRevealed)).toBe(true);

    // Mine should remain unrevealed by revealFromCell.
    expect(game.grid[0][2].isRevealed).toBe(false);
  });

  test('revealFromCell returns 0 for flagged or already revealed start cell', () => {
    const game = buildNewGame({ rows: 2, cols: 2, mines: 0, placeMinesImmediately: false });
    computeAdjacencyNumbers(game);

    game.grid[0][0].isFlagged = true;
    expect(revealFromCell(game, 0, 0)).toBe(0);

    game.grid[0][1].isRevealed = true;
    expect(revealFromCell(game, 0, 1)).toBe(0);
  });
});
