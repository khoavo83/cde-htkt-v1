import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Path to credentials
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

/**
 * Reads previously authorized credentials from the save file.
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = fs.readFileSync(TOKEN_PATH, 'utf8');
    const credentials = JSON.parse(content);
    
    // Parse Python's google-auth token.json format
    const oAuth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret
    );
    
    oAuth2Client.setCredentials({
      access_token: credentials.token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry ? new Date(credentials.expiry).getTime() : null,
    });
    
    return oAuth2Client;
  } catch (err) {
    console.error('Error reading token.json:', err.message);
    return null;
  }
}

/**
 * Get authenticated Google Drive client
 */
export async function getDriveClient() {
  const authClient = await loadSavedCredentialsIfExist();
  if (!authClient) {
    throw new Error('Chưa xác thực OAuth2. Vui lòng chạy script python xác thực trước để tạo token.json.');
  }
  return google.drive({ version: 'v3', auth: authClient });
}

/**
 * Fetch recursively all files and folders inside a given folder ID.
 */
export async function fetchDriveTree(folderId) {
  const drive = await getDriveClient();
  let items = [];
  let pageToken = null;
  
  // To avoid hitting rate limits and timeout, we query everything and build the tree in memory
  // Query: get all files that have folderId as a parent OR are descendants. 
  // Actually, Drive API doesn't support recursive query easily without multiple calls,
  // EXCEPT if we query all files in a shared drive or we know they are in a specific tree.
  // For 3500 files, querying all files with specific fields might be faster, 
  // but to be safe and accurate, we can just do a broad query or recursive fetch.
  // We'll do a flat query for the entire drive and then build a tree, 
  // or a recursive BFS/DFS. Since recursive BFS takes many API calls (one per folder),
  // it might be slow.
  
  // Best approach for a specific folder tree:
  // Fetch ALL folders and files the user has access to, then filter locally.
  // Or query: "'folderId' in parents" recursively.
  
  // Let's implement a recursive BFS to fetch the tree.
  const tree = { id: folderId, name: 'Root', isFolder: true, children: [] };
  const queue = [tree];
  
  while (queue.length > 0) {
    // Process in batches of 5 to avoid rate limits
    const batch = queue.splice(0, 5);
    
    await Promise.all(batch.map(async (parent) => {
      let pageToken = null;
      parent.children = [];
      
      do {
        const res = await drive.files.list({
          q: `'${parent.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          pageSize: 1000,
          fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size)',
          pageToken: pageToken,
        });
        
        const files = res.data.files;
        if (files) {
          for (const file of files) {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const node = {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              webViewLink: file.webViewLink,
              iconLink: file.iconLink,
              modifiedTime: file.modifiedTime,
              size: file.size,
              isFolder,
            };
            parent.children.push(node);
            
            if (isFolder) {
              queue.push(node);
            }
          }
        }
        pageToken = res.data.nextPageToken;
      } while (pageToken);
    }));
  }
  
  // Sắp xếp tự nhiên (Natural Sort)
  const sortTree = (nodes) => {
    nodes.sort((a, b) => {
      // Ưu tiên folder lên trước file
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      
      // Natural sort
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    // Đệ quy sắp xếp con
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortTree(node.children);
      }
    }
  };

  sortTree(tree.children);
  
  return tree.children;
}

/**
 * Fetch recursively all folders inside a given folder ID and return as a flat array.
 */
export async function fetchDriveFoldersFlat(folderId) {
  const drive = await getDriveClient();
  const flatFolders = [];
  const queue = [{ id: folderId, name: 'Root' }];
  
  // Lấy thông tin thư mục gốc
  try {
    const rootRes = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, modifiedTime',
    });
    flatFolders.push({
      id: rootRes.data.id,
      name: rootRes.data.name || 'Root',
      parent_id: null,
      modified_time: rootRes.data.modifiedTime,
    });
  } catch (err) {
    // Nếu lỗi (ví dụ root không tồn tại), fallback
    flatFolders.push({
      id: folderId,
      name: 'Root',
      parent_id: null,
      modified_time: new Date().toISOString(),
    });
  }
  
  while (queue.length > 0) {
    const batch = queue.splice(0, 5);
    
    await Promise.all(batch.map(async (parent) => {
      let pageToken = null;
      do {
        const res = await drive.files.list({
          q: `'${parent.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          pageSize: 1000,
          fields: 'nextPageToken, files(id, name, modifiedTime)',
          pageToken: pageToken,
        });
        
        const files = res.data.files;
        if (files) {
          for (const file of files) {
            flatFolders.push({
              id: file.id,
              name: file.name,
              parent_id: parent.id,
              modified_time: file.modifiedTime,
            });
            queue.push({ id: file.id, name: file.name });
          }
        }
        pageToken = res.data.nextPageToken;
      } while (pageToken);
    }));
  }
  
  return flatFolders;
}

/**
 * Fetch files only (no folders) for a specific folder ID
 */
export async function fetchFolderFiles(folderId) {
  const drive = await getDriveClient();
  let filesList = [];
  let pageToken = null;
  
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      pageSize: 1000,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size)',
      pageToken: pageToken,
    });
    
    if (res.data.files) {
      for (const file of res.data.files) {
        filesList.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          iconLink: file.iconLink,
          modifiedTime: file.modifiedTime,
          size: file.size,
          isFolder: false,
        });
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  
  // Natural sort files
  filesList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  
  return filesList;
}
