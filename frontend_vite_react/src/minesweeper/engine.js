function randInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function keyOf(r, c) {
  return `${r},${c}`;
}

function createEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0
    }))
  );
}

function placeMines(grid, rows, cols, mines, safeCell) {
  const total = rows * cols;
  const forbidden = safeCell ? new Set([keyOf(safeCell.r, safeCell.c)]) : new Set();

  // To make first click safer, also avoid immediate neighbors (optional, but nicer).
  if (safeCell) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = safeCell.r + dr;
        const cc = safeCell.c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        forbidden.add(keyOf(rr, cc));
      }
    }
  }

  const available = [];
  for (let idx = 0; idx < total; idx++) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    if (!forbidden.has(keyOf(r, c))) available.push(idx);
  }

  // Safety: clamp mines to available count.
  const minesToPlace = Math.min(mines, available.length);

  // Fisher–Yates shuffle partial
  for (let i = available.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [available[i], available[j]] = [available[j], available[i]];
  }

  for (let i = 0; i < minesToPlace; i++) {
    const idx = available[i];
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    grid[r][c].isMine = true;
  }
}

// PUBLIC_INTERFACE
export function buildNewGame({ rows, cols, mines, placeMinesImmediately = true, safeCell = null }) {
  /**
   * Build a new Minesweeper game state.
   * When placeMinesImmediately is false, mines will be placed upon first reveal.
   */
  const grid = createEmptyGrid(rows, cols);

  const game = {
    config: { rows, cols, mines },
    grid,
    status: placeMinesImmediately ? 'playing' : 'ready',
    minesPlaced: placeMinesImmediately,
    flagsCount: 0,
    revealedCount: 0
  };

  if (placeMinesImmediately) {
    placeMines(grid, rows, cols, mines, safeCell);
  }

  return game;
}

// PUBLIC_INTERFACE
export function countAdjacentMines(game, r, c) {
  /** Count mines in the 8-neighborhood of a cell. */
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= game.config.rows || cc >= game.config.cols) continue;
      if (game.grid[rr][cc].isMine) count++;
    }
  }
  return count;
}

// PUBLIC_INTERFACE
export function revealFromCell(game, startR, startC) {
  /**
   * Reveal a cell and flood-fill reveal for zero-adjacent areas.
   * Returns number of newly revealed cells.
   *
   * Assumes: adjacency numbers already computed and mines placed.
   */
  const start = game.grid[startR][startC];
  if (start.isRevealed || start.isFlagged) return 0;
  if (start.isMine) return 0;

  const stack = [[startR, startC]];
  let revealed = 0;

  while (stack.length) {
    const [r, c] = stack.pop();
    const cell = game.grid[r][c];
    if (cell.isRevealed || cell.isFlagged) continue;
    if (cell.isMine) continue;

    cell.isRevealed = true;
    revealed++;

    if (cell.adjacentMines !== 0) continue;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= game.config.rows || cc >= game.config.cols) continue;
        const next = game.grid[rr][cc];
        if (next.isRevealed || next.isFlagged) continue;
        if (next.isMine) continue;
        stack.push([rr, cc]);
      }
    }
  }

  return revealed;
}
