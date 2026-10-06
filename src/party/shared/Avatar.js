import React from 'react';
import { avatarById } from '../config/avatars';
import { teamColor } from '../config/teams';
import { GlossyHeart } from './Heart';

// A player's animal on a bubble - or, for a class mode team, its colored heart.
const Avatar = ({ player, size = 'md', showName = false, badge = null, className = '', style }) => {
  const team = teamColor(player && player.color);
  const avatar = avatarById(player && player.avatar);
  const offline = player && player.online === false;
  return (
    <div className={`hb-avatar hb-avatar-${size} ${team ? 'hb-avatar-team' : ''} ${offline ? 'is-offline' : ''} ${className}`} style={style}>
      {team ? (
        <div className="hb-avatar-bubble" role="img" aria-label={player.name}>
          <GlossyHeart from={team.colors[0]} to={team.colors[1]} />
          {badge != null && <span className="hb-avatar-badge">{badge}</span>}
        </div>
      ) : (
        <div className="hb-avatar-bubble" style={{ background: avatar.color }}>
          <span className="hb-avatar-emoji" role="img" aria-label={player ? player.name : ''}>
            {avatar.emoji}
          </span>
          {badge != null && <span className="hb-avatar-badge">{badge}</span>}
        </div>
      )}
      {showName && <div className="hb-avatar-name">{player ? player.name : ''}</div>}
    </div>
  );
};

export default Avatar;
