import React from 'react';
import Avatar from './Avatar';

// "Who found it?" - a sheet of all the players (TV and admin phone).
const PlayerPicker = ({ title, players, ids, selected, onPick, onClear, onClose }) => (
  <div className="hb-picker-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
    <div className="hb-picker" onClick={(e) => e.stopPropagation()}>
      <div className="hb-picker-head">
        <strong>{title}</strong>
        <button type="button" className="hb-icon-btn" onClick={onClose} aria-label="סגירה">
          ✕
        </button>
      </div>
      <div className="hb-picker-grid">
        {ids.map((pid) => (
          <button
            key={pid}
            type="button"
            className={`hb-picker-player ${selected === pid ? 'is-selected' : ''}`}
            onClick={() => onPick(pid)}
            data-testid={`pick-${pid}`}
          >
            <Avatar player={players[pid]} size="lg" showName />
          </button>
        ))}
      </div>
      {selected && onClear && (
        <button type="button" className="hb-btn hb-btn-soft hb-picker-clear" onClick={onClear}>
          ↩️ עוד לא נמצא (ביטול)
        </button>
      )}
    </div>
  </div>
);

export default PlayerPicker;
