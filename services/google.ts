import { SyncPayload, BookRecord } from '../types';

// IMPORTANT: Replace with your actual Google Client ID from the Google Cloud Console.
const GOOGLE_CLIENT_ID = '93993206222-19e48jq3thrh262a7kbq239j9212kdea.apps.googleusercontent.com';
const DRIVE_API_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'Custom Ebook Reader Library';
const BOOKS_SUBFOLDER_NAME = 'books';
const METADATA_FILE_NAME = 'library.json';

let gapiInited = false;
let gisInited = false;
let tokenClient: any = null;

const waitForGlobal = (key: string, subkey?: string): Promise<any> => {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if ((window as any)[key]) {
                if (subkey) {
                    if ((window as any)[key][subkey]) {
                        clearInterval(interval);
                        resolve((window as any)[key]);
                    }
                } else {
                    clearInterval(interval);
                    resolve((window as any)[key]);
                }
            }
        }, 100);
    });
};

export const initGoogleClient = (callback: (resp: any) => void): Promise<any> => {
    return new Promise(async (resolve, reject) => {
        try {
            await Promise.all([waitForGlobal('gapi', 'client'), waitForGlobal('google', 'accounts')]);
            
            if (gisInited) {
                resolve(tokenClient);
                return;
            }

            tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: DRIVE_API_SCOPE,
                callback: callback,
            });
            gisInited = true;

            (window as any).gapi.load('client', async () => {
                await (window as any).gapi.client.init({
                    clientId: GOOGLE_CLIENT_ID,
                    scope: DRIVE_API_SCOPE,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });
                gapiInited = true;
                resolve(tokenClient);
            });
        } catch(error) {
            console.error("Error during Google Client initialization:", error);
            reject(error);
        }
    });
};

export const revokeToken = (token: string) => {
    (window as any).google.accounts.oauth2.revoke(token, () => {
        console.log('Access token revoked.');
    });
};


const findOrCreateFolder = async (folderName: string, parentId?: string): Promise<string> => {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false` + (parentId ? ` and '${parentId}' in parents` : '');
    
    const response = await (window as any).gapi.client.drive.files.list({ q });
    
    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    } else {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId && { parents: [parentId] }),
        };
        const createResponse = await (window as any).gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        return createResponse.result.id;
    }
};

const uploadFile = async (folderId: string, fileName: string, fileData: Blob | ArrayBuffer, mimeType: string): Promise<string> => {
    const metadata = { name: fileName, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileData], { type: mimeType }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ Authorization: `Bearer ${(window as any).gapi.client.getToken().access_token}` }),
        body: form,
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);
    return result.id;
};

const updateFile = async (fileId: string, fileData: Blob | ArrayBuffer, mimeType: string) => {
     const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: new Headers({ Authorization: `Bearer ${(window as any).gapi.client.getToken().access_token}`, 'Content-Type': mimeType }),
        body: fileData,
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error.message);
    return result;
}


export const uploadLibraryToDrive = async (payload: SyncPayload, books: BookRecord[], onProgress: (message: string) => void) => {
    const appFolderId = await findOrCreateFolder(APP_FOLDER_NAME);
    localStorage.setItem('ebook-reader-drive-folder-id', appFolderId);
    
    onProgress(`Uploading ${books.length} book files...`);
    const booksFolderId = await findOrCreateFolder(BOOKS_SUBFOLDER_NAME, appFolderId);

    const bookFileUploads = books.map(async (book, index) => {
        onProgress(`Uploading book ${index + 1}/${books.length}: ${book.title}`);
        await uploadFile(booksFolderId, `${book.id}.epub`, book.epubData, 'application/epub+zip');
    });
    await Promise.all(bookFileUploads);

    onProgress('Uploading library metadata...');
    const metadataBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

    // Check if metadata file already exists
    const q = `'${appFolderId}' in parents and name='${METADATA_FILE_NAME}' and trashed=false`;
    const listResponse = await (window as any).gapi.client.drive.files.list({ q });

    if (listResponse.result.files && listResponse.result.files.length > 0) {
        const fileId = listResponse.result.files[0].id;
        await updateFile(fileId, metadataBlob, 'application/json');
    } else {
        await uploadFile(appFolderId, METADATA_FILE_NAME, metadataBlob, 'application/json');
    }
    onProgress('Upload complete!');
};


export const downloadLibraryFromDrive = async (onProgress: (message: string) => void): Promise<{ payload: SyncPayload; booksWithData: BookRecord[] } | null> => {
    onProgress('Finding app folder in Drive...');
    const appFolderId = await findOrCreateFolder(APP_FOLDER_NAME);
    
    onProgress('Downloading library metadata...');
    const q = `'${appFolderId}' in parents and name='${METADATA_FILE_NAME}' and trashed=false`;
    const listResponse = await (window as any).gapi.client.drive.files.list({ q });

    if (!listResponse.result.files || listResponse.result.files.length === 0) {
        return null; // No library file found
    }

    const metadataFileId = listResponse.result.files[0].id;
    const fileResponse = await (window as any).gapi.client.drive.files.get({
        fileId: metadataFileId,
        alt: 'media',
    });

    const payload: SyncPayload = JSON.parse(fileResponse.body);
    
    onProgress('Finding books subfolder...');
    const booksFolderId = await findOrCreateFolder(BOOKS_SUBFOLDER_NAME, appFolderId);

    const booksWithData: BookRecord[] = [];
    
    for (let i = 0; i < payload.library.length; i++) {
        const bookMeta = payload.library[i];
         if (!bookMeta.id) {
            console.warn(`Book metadata for "${bookMeta.title}" is missing an ID, skipping download.`);
            continue;
        }

        onProgress(`Downloading book ${i + 1}/${payload.library.length}: ${bookMeta.title}`);
        
        // Search for the book file by name
        const bookFileQ = `'${booksFolderId}' in parents and name='${bookMeta.id}.epub' and trashed=false`;
        const bookFileList = await (window as any).gapi.client.drive.files.list({ q: bookFileQ });

        if (bookFileList.result.files && bookFileList.result.files.length > 0) {
            const bookFileId = bookFileList.result.files[0].id;
            
            const accessToken = (window as any).gapi.client.getToken().access_token;
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${bookFileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                 console.warn(`Failed to download book file for "${bookMeta.title}" (ID: ${bookMeta.id}). Status: ${response.statusText}`);
                continue; // Skip this book
            }
            const epubData = await response.arrayBuffer();

            const bookRecord: BookRecord = {
                ...bookMeta,
                epubData: epubData,
            };
            booksWithData.push(bookRecord);

        } else {
             console.warn(`Book file for "${bookMeta.title}" (ID: ${bookMeta.id}) not found in Drive.`);
        }
    }
    
    onProgress('Download complete!');
    return { payload, booksWithData };
};