import React from 'react';
import { avatarById } from '../config/avatars';

const Avatar = ({ player, size = 'md', showName = false, badge = null, className = '', style }) => {
  const avatar = avatarById(player && player.avatar);
  const offline = player && player.online === false;
  return (
    <div className={`hb-avatar hb-avatar-${size} ${offline ? 'is-offline' : ''} ${className}`} style={style}>
      <div className="hb-avatar-bubble" style={{ background: avatar.color }}>
        <span className="hb-avatar-emoji" role="img" aria-label={player ? player.name : ''}>
          {avatar.emoji}
        </span>
        {badge != null && <span className="hb-avatar-badge">{badge}</span>}
      </div>
      {showName && <div className="hb-avatar-name">{player ? player.name : ''}</div>}
    </div>
  );
};

export default Avatar;
