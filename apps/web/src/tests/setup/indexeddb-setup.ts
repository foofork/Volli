// Set up fake-indexeddb globals before any other imports
import indexedDB from 'fake-indexeddb';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import IDBIndex from 'fake-indexeddb/lib/FDBIndex';
import IDBCursor from 'fake-indexeddb/lib/FDBCursor';
import IDBDatabase from 'fake-indexeddb/lib/FDBDatabase';
import IDBFactory from 'fake-indexeddb/lib/FDBFactory';
import IDBObjectStore from 'fake-indexeddb/lib/FDBObjectStore';
import IDBOpenDBRequest from 'fake-indexeddb/lib/FDBOpenDBRequest';
import IDBRequest from 'fake-indexeddb/lib/FDBRequest';
import IDBTransaction from 'fake-indexeddb/lib/FDBTransaction';
import IDBVersionChangeEvent from 'fake-indexeddb/lib/FDBVersionChangeEvent';

// Set all required globals
global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;
global.IDBIndex = IDBIndex;
global.IDBCursor = IDBCursor;
global.IDBDatabase = IDBDatabase;
global.IDBFactory = IDBFactory;
global.IDBObjectStore = IDBObjectStore;
global.IDBOpenDBRequest = IDBOpenDBRequest;
global.IDBRequest = IDBRequest;
global.IDBTransaction = IDBTransaction;
global.IDBVersionChangeEvent = IDBVersionChangeEvent;

export { indexedDB, IDBKeyRange };