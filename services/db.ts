import { BookRecord, BookMetadata } from '../types';

const DB_NAME = 'EbookReaderDB';
const STORE_NAME = 'books';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

const init = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('title', 'title', { unique: false });
      }
    };
  });
};

const addBook = async (book: BookRecord): Promise<number> => {
  const db = await init();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(book);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      console.error('Error adding book:', request.error);
      reject('Error adding book');
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
        const { id, title, author, coverImage, publisher, publicationDate, isbn } = cursor.value;
        books.push({ id, title, author, coverImage, publisher, publicationDate, isbn });
        cursor.continue();
      } else {
        resolve(books);
      }
    };

    request.onerror = () => {
      console.error('Error getting books:', request.error);
      reject('Error getting books');
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
      console.error('Error getting book:', request.error);
      reject('Error getting book');
    };
  });
};


export const db = {
  init,
  addBook,
  getBooksMetadata,
  getBook,
};