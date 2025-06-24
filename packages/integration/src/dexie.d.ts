// Minimal Dexie type declarations for build
declare module 'dexie' {
  export interface Table<T = any, TKey = any> {
    add(item: T): Promise<TKey>;
    get(key: TKey): Promise<T | undefined>;
    put(item: T): Promise<TKey>;
    update(key: TKey, changes: Partial<T>): Promise<number>;
    delete(key: TKey): Promise<void>;
    toArray(): Promise<T[]>;
    where(keyPath: string): WhereClause<T, TKey>;
  }

  export interface WhereClause<T = any, TKey = any> {
    equals(key: any): Collection<T, TKey>;
    above(key: any): Collection<T, TKey>;
    below(key: any): Collection<T, TKey>;
    between(lower: any, upper: any): Collection<T, TKey>;
  }

  export interface Collection<T = any, TKey = any> {
    toArray(): Promise<T[]>;
    count(): Promise<number>;
    first(): Promise<T | undefined>;
    last(): Promise<T | undefined>;
    sortBy(keyPath: string): Promise<T[]>;
    reverse(): Collection<T, TKey>;
    limit(n: number): Collection<T, TKey>;
    delete(): Promise<number>;
  }

  export default class Dexie {
    constructor(dbName: string);
    version(versionNumber: number): {
      stores(schema: { [tableName: string]: string }): void;
    };
    open(): Promise<Dexie>;
    [tableName: string]: Table;
  }
}