import { DB_INDEXES, DB_NAME, DB_VERSION, STORE_NAME } from '../constants';
import type { BookMetadata, BookRecord } from '../types';

import { logger } from './logger';

let dbInstance: IDBDatabase | null = null;

const init = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    if (typeof indexedDB === 'undefined') {
      const err = new Error('IndexedDB is not available in this environment.');
      logger.error('IndexedDB unavailable:', err);
      reject(err);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      logger.error('IndexedDB error:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex(DB_INDEXES.TITLE, DB_INDEXES.TITLE, { unique: false });
      } else {
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          store = transaction.objectStore(STORE_NAME);
        } else {
          // This case should not happen in a normal onupgradeneeded event
          return;
        }
      }
      if (event.oldVersion < 2) {
        if (!store.indexNames.contains(DB_INDEXES.ISBN)) {
          store.createIndex(DB_INDEXES.ISBN, DB_INDEXES.ISBN, { unique: false });
        }
      }
      if (event.oldVersion < 3) {
        if (!store.indexNames.contains(DB_INDEXES.PROVIDER_ID)) {
          store.createIndex(DB_INDEXES.PROVIDER_ID, DB_INDEXES.PROVIDER_ID, { unique: false });
        }
      }
    };
  });
};

const saveBook = async (book: BookRecord): Promise<number> => {
  const db = await init();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(book);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      logger.error('Error saving book:', request.error);
      reject('Error saving book');
    };
  });
};

const getBooksMetadata = async (): Promise<BookMetadata[]> => {
  const db = await init();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    const books: BookMetadata[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const { id, title, author, coverImage, publisher, publicationDate, isbn, providerId, providerName, description, subjects, format } = cursor.value;
        books.push({ id, title, author, coverImage, publisher, publicationDate, isbn, providerId, providerName, description, subjects, format });
        cursor.continue();
      } else {
        resolve(books);
      }
    };

    request.onerror = () => {
      logger.error('Error getting books:', request.error);
      reject('Error getting books');
    };
  });
};

const getAllBooks = async (): Promise<BookRecord[]> => {
  const db = await init();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as BookRecord[]);
    };

    request.onerror = () => {
      logger.error('Error getting all books:', request.error);
      reject('Error getting all books');
    };
  });
};

const getBook = async (id: number): Promise<BookRecord | undefined> => {
  const db = await init();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as BookRecord | undefined);
    };

    request.onerror = () => {
      logger.error('Error getting book:', request.error);
      reject('Error getting book');
    };
  });
};

const getBookMetadata = async (id: number): Promise<BookMetadata | null> => {
  const db = await init();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const bookRecord = request.result as BookRecord | undefined;
      if (bookRecord) {
        const { id, title, author, coverImage, publisher, publicationDate, isbn, providerId, providerName, distributor, description, subjects, format } = bookRecord;
        resolve({ id: id!, title, author, coverImage, publisher, publicationDate, isbn, providerId, providerName, distributor, description, subjects, format });
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      logger.error('Error getting book metadata:', request.error);
      reject('Error getting book metadata');
    };
  });
};


const findBookByIdentifier = async (identifier: string): Promise<BookRecord | null> => {
  if (!identifier) return null;
  const db = await init();

  const search = (indexName: 'providerId' | 'isbn'): Promise<BookRecord | null> => {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains(indexName)) {
          resolve(null);
          return;
        }
        const index = store.index(indexName);
        const request = index.get(identifier);

        request.onsuccess = () => {
          resolve((request.result as BookRecord) || null);
        };
        request.onerror = () => {
          logger.error(`Error finding book by ${indexName}:`, request.error);
          reject(`Error finding book by ${indexName}`);
        };
      } catch (e) {
        logger.error(`Error initiating search on index ${indexName}:`, e);
        resolve(null);
      }
    });
  };

  // First, try searching by the new `providerId` field.
  const byProviderId = await search('providerId');
  if (byProviderId) {
    return byProviderId;
  }

  // If not found, fall back to searching by the old `isbn` field for backward compatibility.
  return search('isbn');
};

const deleteBook = async (id: number): Promise<void> => {
  const db = await init();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      logger.error('Error deleting book:', request.error);
      reject('Error deleting book');
    };
  });
};

const clearAllBooks = async (): Promise<void> => {
  const db = await init();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      logger.error('Error clearing books:', request.error);
      reject('Error clearing books');
    };
  });
};

export const db = {
  init,
  saveBook,
  getBooksMetadata,
  getAllBooks,
  getBook,
  getBookMetadata,
  findBookByIdentifier,
  deleteBook,
  clearAllBooks,
};
