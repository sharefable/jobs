/* eslint-disable @typescript-eslint/no-empty-function */
import CachedData from './cached-data';
import { sleep } from './utils';

test('Should fetch data if not exists and cache it for subsequent run', async () => {
  let called = 0;
  const cache = new CachedData<string>(
    async(key: string) => {
      called++;
      await sleep(1000);
      return `${key}::${Math.random()}`;
    },
    { maxNoOfRecordToCache: 5 },
  );

  // first time should not get data from cache
  const val = await cache.get('key1', '1', () => {});
  (expect as any)(val.data.startsWith('key1::'), `Retruned value: ${JSON.stringify(val, null, 2)}`).toBeTruthy();
  expect(val._stat.cacheHit).toBe(false);
  expect(val._stat.currentNoOfRecordInCache).toBe(1);

  const val2 = await cache.get('key1', '1', () => {});
  // second time should get data from cache
  (expect as any)(val2.data.startsWith('key1::'), `Retruned value: ${JSON.stringify(val2, null, 2)}`).toBeTruthy();
  expect(val2._stat.cacheHit).toBe(true);
  expect(val2._stat.currentNoOfRecordInCache).toBe(1);
  expect(called).toBe(1);
  expect(val.data).toBe(val2.data);

  // eviction should be ran
  const genStat = cache._stat();
  expect(genStat.evictCalledAt).toBe(0);
  expect(genStat.evictRanAt).toBe(0);

  // should evict cache if invalidation key does not match
  const val3 = await cache.get('key1', '2', () => {});
  // second time should get data from cache
  (expect as any)(val3.data.startsWith('key1::'), `Retruned value: ${JSON.stringify(val3, null, 2)}`).toBeTruthy();
  expect(val3._stat.cacheHit).toBe(false);
  expect(val3._stat.currentNoOfRecordInCache).toBe(1);
  expect(called).toBe(2);
  expect(val.data).not.toBe(val3.data);
});

test('Should evict data properly once the cache is populated', async () => {
  const t1 = +new Date();
  let called = 0;
  const cache = new CachedData<string>(
    async(key: string) => {
      called++;
      await sleep(1000);
      return `${key}::${Math.random()}`;
    },
    { maxNoOfRecordToCache: 5 },
  );

  const cachedData = await Promise.all((new Array(8).fill(0)).map((_, i) => cache.get(`key${i}`, '1',() => {})));
  (expect as any)(cachedData[0].data.startsWith('key0::'), `Retruned value: ${JSON.stringify(cachedData[0].data, null, 2)}`).toBeTruthy();
  (expect as any)(cachedData.at(-1)!.data.startsWith('key7::'), `Retruned value: ${JSON.stringify(cachedData.at(-1)!.data, null, 2)}`).toBeTruthy();

  await sleep(200);
  const genStat = cache._stat();
  expect(genStat.evictCalledAt).toBeGreaterThanOrEqual(t1);
  expect(genStat.evictRanAt).toBeGreaterThanOrEqual(t1);
  expect(genStat.currentNoOfRecordInCache).toBeGreaterThanOrEqual(5);
});
