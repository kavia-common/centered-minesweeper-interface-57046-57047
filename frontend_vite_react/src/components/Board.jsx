import React, { useMemo } from 'react';
import Cell from './Cell.jsx';

function useBoardGridTemplate(cols) {
  return useMemo(() => ({ gridTemplateColumns: `repeat(${cols}, var(--cell-size))` }), [cols]);
}

// PUBLIC_INTERFACE
export default function Board({ game, onRevealCell, onToggleFlag, onChord }) {
  /** Render the Minesweeper board and map user interactions to game actions. */
  const { rows, cols } = game.config;
  const template = useBoardGridTemplate(cols);

  return (
    <div
      className="board"
      style={template}
      role="grid"
      aria-rowcount={rows}
      aria-colcount={cols}
    >
      {game.grid.map((row, r) =>
        row.map((cell, c) => (
          <Cell
            key={`${r}-${c}`}
            cell={cell}
            r={r}
            c={c}
            gameStatus={game.status}
            onReveal={() => onRevealCell(r, c)}
            onToggleFlag={() => onToggleFlag(r, c)}
            onChord={() => onChord(r, c)}
          />
        ))
      )}
    </div>
  );
}
