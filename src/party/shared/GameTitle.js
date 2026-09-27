import React from 'react';

// Big "game logo" text: gradient letters with a thick white outline and a 3D
// shadow (see .hb-gt in party.css). Keep emoji outside - they can't be outlined.
const GameTitle = ({ as: Tag = 'h1', text, tone = 'pink', className = '', style }) => (
  <Tag className={`hb-gt hb-gt-${tone} ${className}`} data-text={text} style={style}>
    <span className="hb-gt-fill">{text}</span>
  </Tag>
);

export default GameTitle;
