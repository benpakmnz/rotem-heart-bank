import { parsePartyRoute } from './routes';

test('addresses: the TV, the screensaver, the phones and the game master', () => {
  expect(parsePartyRoute('/')).toEqual({ view: 'host' });
  expect(parsePartyRoute('/party')).toEqual({ view: 'host' });
  expect(parsePartyRoute('/saver')).toEqual({ view: 'host', saver: true });
  expect(parsePartyRoute('/saver/')).toEqual({ view: 'host', saver: true });
  expect(parsePartyRoute('/join')).toEqual({ view: 'player', code: null });
  expect(parsePartyRoute('/join/1234')).toEqual({ view: 'player', code: '1234' });
  expect(parsePartyRoute('/join/12ab')).toEqual({ view: 'player', code: null });
  expect(parsePartyRoute('/admin/1234')).toEqual({ view: 'admin', code: '1234' });
});
