import React, { Suspense, lazy, useEffect } from 'react';
import { parsePartyRoute } from './routes';
import './party.css';

// The TV and the phones only download their own screens.
const HostApp = lazy(() => import('./host/HostApp'));
const PlayerApp = lazy(() => import('./player/PlayerApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

const TITLES = { host: 'אוצר הלבבות - מסך הטלוויזיה 💖', class: 'אוצר הלבבות - משחק כיתתי 🏫', admin: 'אוצר הלבבות - ניהול 🎛️', player: 'אוצר הלבבות 💖' };

const PartyApp = () => {
  const route = parsePartyRoute(window.location.pathname);

  useEffect(() => {
    document.title = TITLES[route.classMode ? 'class' : route.view] || TITLES.player;
  }, [route.view, route.classMode]);

  return (
    <div className="hb-root">
      <Suspense fallback={<div className="hb-boot" />}>
        {route.view === 'host' && <HostApp saver={Boolean(route.saver)} classMode={Boolean(route.classMode)} />}
        {route.view === 'player' && <PlayerApp initialCode={route.code} />}
        {route.view === 'admin' && <AdminApp initialCode={route.code} />}
      </Suspense>
    </div>
  );
};

export default PartyApp;
