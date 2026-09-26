import { meterFraction, meterPercent, topTappers, triviaPoints, computeBankTarget } from './scoring';
import { normalizeWord, wordLetters, wordShape, joinByShape, scrambleLetters, cleanText } from './text';
import { layoutHeartCloud, buildCloudEntries, insideHeart, CLOUD_W, CLOUD_H } from './heartCloud';
import { createRng } from './random';

describe('scoring', () => {
  test('trivia speed bonus counts full seconds', () => {
    expect(triviaPoints(true, 0, 15000)).toBe(1000 + 15 * 200);
    expect(triviaPoints(true, 999, 15000)).toBe(1000 + 14 * 200);
    expect(triviaPoints(true, 16000, 15000)).toBe(1000);
    expect(triviaPoints(false, 0, 15000)).toBe(0);
  });

  test('top tappers', () => {
    expect(topTappers({})).toEqual([]);
    expect(topTappers({ a: 0 })).toEqual([]);
    expect(topTappers({ b: 5, a: 5, c: 1 })).toEqual(['a', 'b']);
  });

  test('bank target grows with the family', () => {
    const base = { questions: 6, charadesRounds: 3, words: 3, tapSeconds: 60 };
    const small = computeBankTarget({ ...base, players: 3 });
    const big = computeBankTarget({ ...base, players: 12 });
    expect(big).toBeGreaterThan(small);
    expect(small % 1000).toBe(0);
  });

  test('the meter is linear, then creeps towards 99% but never reaches 100%', () => {
    expect(meterFraction(0, 1000)).toBe(0);
    expect(meterFraction(500, 1000)).toBeCloseTo(0.5);
    expect(meterFraction(800, 1000)).toBeCloseTo(0.8);
    let prev = 0;
    for (let bank = 0; bank <= 10000; bank += 50) {
      const f = meterFraction(bank, 1000);
      expect(f).toBeGreaterThanOrEqual(prev);
      expect(f).toBeLessThan(0.99 + 1e-12);
      prev = f;
    }
    expect(meterPercent(1e9, 1000)).toBe(99);
    expect(meterPercent(1, 1000, { full: true })).toBe(100);
    expect(meterFraction(10, 0)).toBe(0);
  });
});

describe('text', () => {
  test('words: letters, shape and spacing', () => {
    expect(normalizeWord('  מזל   טוב! ')).toBe('מזל טוב');
    expect(normalizeWord('שָׁלוֹם')).toBe('שלום');
    expect(wordLetters('מזל טוב')).toEqual(['מ', 'ז', 'ל', 'ט', 'ו', 'ב']);
    expect(wordShape('מזל טוב')).toEqual([3, 3]);
    expect(wordShape('')).toEqual([]);
    expect(joinByShape(['מ', 'ז', 'ל', 'ט', 'ו', 'ב'], [3, 3])).toBe('מזל טוב');
  });

  test('scrambles never come out solved', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i += 1) {
      expect(scrambleLetters(['א', 'ה', 'ב', 'ה'], rng).join('')).not.toBe('אהבה');
    }
    expect(scrambleLetters(['א', 'א'], rng)).toEqual(['א', 'א']);
  });

  test('cleanText', () => {
    expect(cleanText('  a\u0000b \n  c ', 10)).toBe('a b c');
    expect(cleanText('אבגדהוזחטי', 4)).toBe('אבגד');
    expect(cleanText(null, 5)).toBe('');
  });
});

describe('heart word cloud', () => {
  const measure = (text, size) => ({ w: Array.from(text).length * size * 0.56, h: size * 1.15 });

  test('places every word inside the heart without overlaps', () => {
    const words = [
      'אהבה', 'שמחה', 'בריאות', 'הצלחה', 'חברים', 'צחוק', 'אושר', 'הפתעות', 'הרפתקאות', 'חיבוקים',
      'יצירתיות', 'הגשמת חלומות', 'גלידה', 'ים', 'שקט', 'ריקודים', 'מתנות', 'אומץ', 'חוכמה', 'נשיקות',
      'שירים', 'ציורים', 'טיולים', 'כיף', 'סבלנות', 'שמש', 'פרחים', 'הרבה אהבה', 'יום מושלם', 'חלומות',
      'כוכבים', 'לבבות', 'מלא צבעים', 'משחקים', 'ספרים', 'בלונים', 'עוגה', 'הצלחה בלימודים', 'חיוכים', 'אור',
    ];
    const blessings = [...words, 'אהבה', 'אהבה', 'שמחה'].map((text, i) => ({ id: `b${i}`, text, at: i }));
    const entries = buildCloudEntries(blessings);
    expect(entries[0].text).toBe('אהבה');
    expect(entries[0].count).toBe(3);
    expect(entries[0].ids).toEqual(['b0', `b${words.length}`, `b${words.length + 1}`]);

    const started = Date.now();
    const { items } = layoutHeartCloud(entries, measure);
    expect(Date.now() - started).toBeLessThan(3000);
    expect(items).toHaveLength(entries.length);

    const rects = items.map((it) => {
      const { w, h } = measure(it.text, it.size);
      return { x0: it.x - w / 2, x1: it.x + w / 2, y0: it.y - h / 2, y1: it.y + h / 2 };
    });
    rects.forEach((r, i) => {
      expect(r.x0).toBeGreaterThanOrEqual(0);
      expect(r.x1).toBeLessThanOrEqual(CLOUD_W);
      expect(r.y1).toBeLessThanOrEqual(CLOUD_H);
      [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].forEach(([x, y]) => {
        expect(insideHeart(x, y)).toBe(true);
      });
      rects.slice(i + 1).forEach((o) => {
        const overlap = r.x0 < o.x1 && o.x0 < r.x1 && r.y0 < o.y1 && o.y0 < r.y1;
        expect(overlap).toBe(false);
      });
    });
    // the most loved wish is the biggest word
    expect(items[0].size).toBe(Math.max(...items.map((it) => it.size)));
  });

  test('earlier words keep their place when new ones arrive', () => {
    const blessings = ['אהבה', 'שמחה', 'בריאות', 'חברים'].map((text, i) => ({ id: `b${i}`, text, at: i }));
    const firstLayout = layoutHeartCloud(buildCloudEntries(blessings), measure);
    const first = firstLayout.items;
    const more = [...blessings, { id: 'b9', text: 'צחוק', at: 9 }];
    const second = layoutHeartCloud(buildCloudEntries(more), measure, { startBase: firstLayout.base }).items;
    expect(second).toHaveLength(5);
    first.forEach((item, i) => {
      expect(second[i].key).toBe(item.key);
      expect(second[i].x).toBeCloseTo(item.x);
      expect(second[i].y).toBeCloseTo(item.y);
    });
  });

  test('empty cloud', () => {
    expect(layoutHeartCloud([], measure).items).toEqual([]);
  });
});
