import React, { useState } from 'react';
import { AVATARS } from '../config/avatars';
import { MAX_NAME_LENGTH } from '../config/game';
import { cleanText } from '../lib/text';
import { LogoHeart } from '../shared/Heart';

const JoinScreen = ({ name: birthdayName, defaults, onJoin, removed }) => {
  const [name, setName] = useState((defaults && defaults.name) || '');
  const [avatar, setAvatar] = useState(
    (defaults && defaults.avatar) || AVATARS[Math.floor(Math.random() * AVATARS.length)].id
  );
  const clean = cleanText(name, MAX_NAME_LENGTH);

  return (
    <div className="hb-phone hb-join">
      <header className="hb-join-head">
        <LogoHeart className="hb-join-logo" />
        <h1 className="hb-phone-title">בנק הלבבות של {birthdayName}</h1>
        {removed ? <p className="hb-phone-text">יצאת מהמשחק - אפשר להצטרף שוב 😊</p> : <p className="hb-phone-text">ממלאים את הבנק ב-100% אהבה! 💖</p>}
      </header>
      <form
        className="hb-join-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (clean) onJoin({ name: clean, avatar });
        }}
      >
        <label className="hb-join-label" htmlFor="hb-name">
          איך קוראים לך?
        </label>
        <input
          id="hb-name"
          className="hb-input hb-join-name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          placeholder="השם שלך"
          autoComplete="nickname"
          enterKeyHint="done"
        />
        <div className="hb-join-label">בחרו דמות:</div>
        <div className="hb-avatar-picker" role="radiogroup" aria-label="דמות">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={avatar === a.id}
              className={`hb-avatar-option ${avatar === a.id ? 'is-selected' : ''}`}
              style={{ background: a.color }}
              onClick={() => setAvatar(a.id)}
            >
              {a.emoji}
            </button>
          ))}
        </div>
        <button type="submit" className="hb-btn hb-btn-primary hb-btn-block hb-join-go" disabled={!clean}>
          💖 מצטרפים למשחק!
        </button>
      </form>
    </div>
  );
};

export default JoinScreen;
