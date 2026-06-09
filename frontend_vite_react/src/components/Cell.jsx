import React, { useMemo } from 'react';

const NUMBER_COLORS = {
  1: 'var(--n1)',
  2: 'var(--n2)',
  3: 'var(--n3)',
  4: 'var(--n4)',
  5: 'var(--n5)',
  6: 'var(--n6)',
  7: 'var(--n7)',
  8: 'var(--n8)'
};

function cellAriaLabel(cell, gameStatus) {
  if (cell.isRevealed) {
    if (cell.isMine) return 'Mina';
    if (cell.adjacentMines === 0) return 'Vacío';
    return `Número ${cell.adjacentMines}`;
  }
  if (cell.isFlagged) return 'Bandera';
  if (gameStatus === 'lost' && cell.isMine) return 'Mina';
  return 'Oculto';
}

// PUBLIC_INTERFACE
export default function Cell({ cell, gameStatus, onReveal, onToggleFlag, onChord }) {
  /** Render a single Minesweeper cell with mouse interactions. */
  const isGameOver = gameStatus === 'won' || gameStatus === 'lost';

  const className = useMemo(() => {
    const base = ['cell'];
    if (cell.isRevealed) base.push('revealed');
    else base.push('hidden');

    if (cell.isFlagged) base.push('flagged');
    if (cell.isRevealed && cell.isMine) base.push('mine');
    if (gameStatus === 'lost' && cell.isRevealed && cell.isMine) base.push('exploded');
    if (isGameOver) base.push('disabled');

    return base.join(' ');
  }, [cell.isRevealed, cell.isFlagged, cell.isMine, gameStatus, isGameOver]);

  const content = useMemo(() => {
    if (cell.isRevealed) {
      if (cell.isMine) return '●';
      if (cell.adjacentMines === 0) return '';
      return String(cell.adjacentMines);
    }
    if (cell.isFlagged) return '⚑';
    return '';
  }, [cell.isRevealed, cell.isMine, cell.adjacentMines, cell.isFlagged]);

  const numberStyle = useMemo(() => {
    if (!cell.isRevealed || cell.isMine || cell.adjacentMines <= 0) return undefined;
    return { color: NUMBER_COLORS[cell.adjacentMines] ?? 'var(--text)' };
  }, [cell.isRevealed, cell.isMine, cell.adjacentMines]);

  function handleClick(e) {
    e.preventDefault();
    if (isGameOver) return;

    // Single click reveals.
    onReveal();
  }

  function handleContextMenu(e) {
    e.preventDefault();
    if (isGameOver) return;

    // Right click toggles flag.
    onToggleFlag();
  }

  function handleDoubleClick(e) {
    e.preventDefault();
    if (isGameOver) return;

    // Double click performs chord.
    onChord();
  }

  function handleKeyDown(e) {
    if (isGameOver) return;

    // Simple keyboard interactions.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onReveal();
    }
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      onToggleFlag();
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      aria-label={cellAriaLabel(cell, gameStatus)}
    >
      <span className="cell-content" style={numberStyle} aria-hidden="true">
        {content}
      </span>
    </button>
  );
}
