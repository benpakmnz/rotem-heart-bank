import React, { Suspense, lazy, useEffect } from 'react';
import { parsePartyRoute } from './routes';
import './party.css';

// The TV and the phones only download their own screens.
const HostApp = lazy(() => import('./host/HostApp'));
const PlayerApp = lazy(() => import('./player/PlayerApp'));

const PartyApp = () => {
  const route = parsePartyRoute(window.location.pathname);

  useEffect(() => {
    document.title = route.view === 'host' ? 'בנק הלבבות - מסך הטלוויזיה 💖' : 'בנק הלבבות 💖';
  }, [route.view]);

  return (
    <div className="hb-root">
      <Suspense fallback={<div className="hb-boot" />}>
        {route.view === 'host' ? <HostApp /> : <PlayerApp initialCode={route.code} />}
      </Suspense>
    </div>
  );
};

export default PartyApp;
