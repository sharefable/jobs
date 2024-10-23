/* eslint-disable @typescript-eslint/ban-types */

export default class CachedData<T> {
  private maxNoOfRecordToCache;
  private currentNoOfRecordInCache = 0;
  private evictionTimer: ReturnType<typeof setTimeout> | null = null;
  private evictCalledAt = 0;
  private evictRanAt = 0;
  private cache: Record<string, {
    _key: string,
    invalidation_key: string;
    data: T,
    insertTimeUTS: number;
    lastAccessedUTS: number,
  }> = {};
  private source: (key: string) => Promise<T>;

  constructor(source: (key: string) => Promise<T>, options?: {
    maxNoOfRecordToCache?: number;
  }) {
    this.source = source;
    this.maxNoOfRecordToCache = options?.maxNoOfRecordToCache || 50;
  }

  _stat() {
    return {
      evictRanAt: this.evictRanAt,
      evictCalledAt: this.evictCalledAt,
      currentNoOfRecordInCache: this.currentNoOfRecordInCache,
    };
  }

  // Get the file if it's present in cache
  // Else get it from source and cahce it. The caching evicion happens async
  async get(fileKey: string, invalidation_key: string, log: Function): Promise<{
    data: T,
    _stat: {
      cacheHit: boolean;
      currentNoOfRecordInCache: number;
      insertTimeUTS: number;
    }
  }> {
    if (fileKey in this.cache && this.cache[fileKey].invalidation_key === invalidation_key) {
      const entity = this.cache[fileKey];
      entity.lastAccessedUTS = +new Date();
      return {
        data: entity.data,
        _stat: {
          cacheHit: true,
          currentNoOfRecordInCache: this.currentNoOfRecordInCache,
          insertTimeUTS: entity.insertTimeUTS,
        },
      };
    }
    log(`Cache miss for ${fileKey}. Getting value form source`);

    const fileJson = await this.source(fileKey);
    const d = +new Date();
    this.cache[fileKey] =  {
      _key: fileKey,
      invalidation_key,
      data: fileJson,
      lastAccessedUTS: d,
      insertTimeUTS: d,
    };
    this.currentNoOfRecordInCache = Object.keys(this.cache).length;
    this.evict(log);
    return {
      data: fileJson as T,
      _stat: {
        cacheHit: false,
        currentNoOfRecordInCache: this.currentNoOfRecordInCache,
        insertTimeUTS: d,
      },
    };
  }

  // eviction happens besed on least recently used policy
  // This matches with the access pattern as when a demo is accessed for the first time,
  // there would be subsequent operation that's done on the demo quickly, and once the ops are done
  // the demo is done for a long time
  private evict(log: Function) {
    if (this.evictionTimer) clearTimeout(this.evictionTimer);
    if (this.currentNoOfRecordInCache <= this.maxNoOfRecordToCache) return;
    this.evictCalledAt = +new Date();
    this.evictionTimer = setTimeout(() => {
      const entriesByAccessAsc = Object.values(this.cache).sort((m, n) => m.lastAccessedUTS - n.lastAccessedUTS);
      const evictedRecords = entriesByAccessAsc.splice(0, Math.max( entriesByAccessAsc.length - this.maxNoOfRecordToCache, 0));
      let i = 0;
      for (const rec of evictedRecords) {
        delete this.cache[rec._key];
        i++;
      }
      this.currentNoOfRecordInCache = Object.keys(this.cache).length;
      log(`${i} records are evicted`);
      this.evictRanAt = +new Date();
    }, 1);
  }
}
