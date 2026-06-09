import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildNewGame, countAdjacentMines, revealFromCell } from './minesweeper/engine.js';
import Board from './components/Board.jsx';

const PRESETS = [
  { key: 'small', label: 'Pequeño (9×9, 10)', rows: 9, cols: 9, mines: 10 },
  { key: 'medium', label: 'Mediano (16×16, 40)', rows: 16, cols: 16, mines: 40 },
  { key: 'large', label: 'Grande (16×30, 99)', rows: 16, cols: 30, mines: 99 }
];

function formatStatus(status) {
  switch (status) {
    case 'ready':
      return 'Listo';
    case 'playing':
      return 'En juego';
    case 'won':
      return '¡Ganaste!';
    case 'lost':
      return 'Perdiste';
    default:
      return status;
  }
}

// PUBLIC_INTERFACE
export default function App() {
  /** Minesweeper game UI and state container. */
  const [presetKey, setPresetKey] = useState(PRESETS[0].key);
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);

  const [game, setGame] = useState(() =>
    buildNewGame({
      rows: preset.rows,
      cols: preset.cols,
      mines: preset.mines,
      // We delay mine placement until the first reveal for better UX.
      placeMinesImmediately: false
    })
  );

  const status = game.status;
  const minesTotal = game.config.mines;
  const flagsCount = game.flagsCount;
  const minesRemaining = Math.max(0, minesTotal - flagsCount);

  // When preset changes, reset game.
  useEffect(() => {
    setGame(
      buildNewGame({
        rows: preset.rows,
        cols: preset.cols,
        mines: preset.mines,
        placeMinesImmediately: false
      })
    );
  }, [preset.rows, preset.cols, preset.mines]);

  const firstActionRef = useRef(true);
  useEffect(() => {
    firstActionRef.current = true;
  }, [presetKey]);

  function resetGame() {
    firstActionRef.current = true;
    setGame(
      buildNewGame({
        rows: preset.rows,
        cols: preset.cols,
        mines: preset.mines,
        placeMinesImmediately: false
      })
    );
  }

  function ensureMinesPlacedSafe(r, c, currentGame) {
    if (currentGame.minesPlaced) return currentGame;

    // Place mines while guaranteeing first click is not a mine.
    const next = buildNewGame({
      rows: currentGame.config.rows,
      cols: currentGame.config.cols,
      mines: currentGame.config.mines,
      placeMinesImmediately: true,
      safeCell: { r, c }
    });

    // Preserve revealed/flagged state if any existed (shouldn't on first action, but keep robust).
    for (let rr = 0; rr < next.config.rows; rr++) {
      for (let cc = 0; cc < next.config.cols; cc++) {
        next.grid[rr][cc].isRevealed = currentGame.grid[rr][cc].isRevealed;
        next.grid[rr][cc].isFlagged = currentGame.grid[rr][cc].isFlagged;
      }
    }
    next.flagsCount = currentGame.flagsCount;
    next.status = currentGame.status;
    next.revealedCount = currentGame.revealedCount;

    return next;
  }

  function computeAdjacencyNumbers(nextGame) {
    for (let r = 0; r < nextGame.config.rows; r++) {
      for (let c = 0; c < nextGame.config.cols; c++) {
        const cell = nextGame.grid[r][c];
        cell.adjacentMines = cell.isMine ? 0 : countAdjacentMines(nextGame, r, c);
      }
    }
  }

  function finalizeWinLoss(nextGame) {
    if (nextGame.status === 'lost') return;

    const totalCells = nextGame.config.rows * nextGame.config.cols;
    const safeCells = totalCells - nextGame.config.mines;
    if (nextGame.revealedCount >= safeCells) {
      nextGame.status = 'won';
      // Auto-flag remaining mines for clarity.
      for (let r = 0; r < nextGame.config.rows; r++) {
        for (let c = 0; c < nextGame.config.cols; c++) {
          const cell = nextGame.grid[r][c];
          if (cell.isMine && !cell.isFlagged) {
            cell.isFlagged = true;
            nextGame.flagsCount += 1;
          }
        }
      }
    } else if (nextGame.minesPlaced) {
      nextGame.status = 'playing';
    }
  }

  function onRevealCell(r, c) {
    setGame((prev) => {
      if (prev.status === 'won' || prev.status === 'lost') return prev;
      const prevCell = prev.grid[r][c];
      if (prevCell.isFlagged || prevCell.isRevealed) return prev;

      let next = structuredClone(prev);

      // Place mines on first reveal to avoid immediate loss.
      if (!next.minesPlaced) {
        next = ensureMinesPlacedSafe(r, c, next);
      }

      computeAdjacencyNumbers(next);

      const cell = next.grid[r][c];
      if (cell.isMine) {
        cell.isRevealed = true;
        next.revealedCount += 1;
        next.status = 'lost';

        // Reveal all mines at game over.
        for (let rr = 0; rr < next.config.rows; rr++) {
          for (let cc = 0; cc < next.config.cols; cc++) {
            const cl = next.grid[rr][cc];
            if (cl.isMine) cl.isRevealed = true;
          }
        }
        return next;
      }

      const revealedDelta = revealFromCell(next, r, c);
      next.revealedCount += revealedDelta;

      finalizeWinLoss(next);
      return next;
    });
  }

  function onToggleFlag(r, c) {
    setGame((prev) => {
      if (prev.status === 'won' || prev.status === 'lost') return prev;
      const prevCell = prev.grid[r][c];
      if (prevCell.isRevealed) return prev;

      const next = structuredClone(prev);
      const cell = next.grid[r][c];

      cell.isFlagged = !cell.isFlagged;
      next.flagsCount += cell.isFlagged ? 1 : -1;

      if (!next.minesPlaced) {
        // Still "ready" until mines are placed by first reveal.
        next.status = 'ready';
      } else {
        next.status = 'playing';
      }
      return next;
    });
  }

  function onChord(r, c) {
    // "Chord": on a revealed numbered cell, reveal neighbors if flags == adjacentMines
    setGame((prev) => {
      if (prev.status === 'won' || prev.status === 'lost') return prev;
      if (!prev.minesPlaced) return prev;

      const baseCell = prev.grid[r][c];
      if (!baseCell.isRevealed || baseCell.adjacentMines <= 0) return prev;

      const next = structuredClone(prev);

      computeAdjacencyNumbers(next);

      const cell = next.grid[r][c];
      let flaggedNeighbors = 0;
      const neighbors = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= next.config.rows || cc >= next.config.cols) continue;
          neighbors.push([rr, cc]);
          if (next.grid[rr][cc].isFlagged) flaggedNeighbors++;
        }
      }

      if (flaggedNeighbors !== cell.adjacentMines) return prev;

      let revealedDelta = 0;
      for (const [rr, cc] of neighbors) {
        const n = next.grid[rr][cc];
        if (n.isRevealed || n.isFlagged) continue;

        if (n.isMine) {
          // Mistake -> lose
          n.isRevealed = true;
          next.revealedCount += 1;
          next.status = 'lost';
          for (let rrr = 0; rrr < next.config.rows; rrr++) {
            for (let ccc = 0; ccc < next.config.cols; ccc++) {
              const cl = next.grid[rrr][ccc];
              if (cl.isMine) cl.isRevealed = true;
            }
          }
          return next;
        }

        revealedDelta += revealFromCell(next, rr, cc);
      }

      next.revealedCount += revealedDelta;
      finalizeWinLoss(next);
      return next;
    });
  }

  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="header">
          <div className="title-block">
            <h1 className="title">Buscaminas</h1>
            <p className="subtitle">Click izquierdo: revelar · Click derecho: bandera · Doble click: despeje</p>
          </div>

          <div className="controls">
            <label className="control">
              <span className="control-label">Tamaño</span>
              <select
                className="select"
                value={presetKey}
                onChange={(e) => setPresetKey(e.target.value)}
                aria-label="Seleccionar tamaño de tablero"
              >
                {PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="button" onClick={resetGame} type="button">
              Reiniciar
            </button>
          </div>
        </header>

        <main className="main">
          <section className="hud" aria-label="Estado del juego">
            <div className="hud-item">
              <div className="hud-label">Minas</div>
              <div className="hud-value">{minesTotal}</div>
            </div>
            <div className="hud-item">
              <div className="hud-label">Banderas</div>
              <div className="hud-value">{flagsCount}</div>
            </div>
            <div className="hud-item">
              <div className="hud-label">Restantes</div>
              <div className="hud-value">{minesRemaining}</div>
            </div>
            <div className={`hud-pill ${status}`}>
              <span className="hud-pill-label">Estado</span>
              <span className="hud-pill-value">{formatStatus(status)}</span>
            </div>
          </section>

          <section className="board-wrap" aria-label="Tablero de Buscaminas">
            <Board
              game={game}
              onRevealCell={onRevealCell}
              onToggleFlag={onToggleFlag}
              onChord={onChord}
            />
            <div className="legend">
              <span className="legend-item">
                <span className="kbd">Click</span> revelar
              </span>
              <span className="legend-item">
                <span className="kbd">Right click</span> bandera
              </span>
              <span className="legend-item">
                <span className="kbd">Double click</span> despeje
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
