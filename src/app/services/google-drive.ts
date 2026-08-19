// src/app/services/google-drive.ts

import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';

// ⚠️ PASTE YOUR CLIENT ID HERE
const CLIENT_ID = "211975122400-8e4oeeo55ei7r00jrpisigue8s4fe02c.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "finance_backup.json";


// ⚠️ Update this to your live deployed bridge URL
const REDIRECT_URI = "https://cloud-sync-redirect.vercel.app/"; 

export const loginToGoogleMobile = async (): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES}`;

      // 1. Start listening for the deep link bounce-back
      const listener = await CapacitorApp.addListener('appUrlOpen', (data) => {
        if (data.url.includes('expensetracker://auth')) {
          const hash = data.url.split('#')[1];
          if (hash) {
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            if (token) {
              Browser.close(); // Close the system browser
              listener.remove(); // Clean up memory
              resolve(token);
              return;
            }
          }
          reject("Token extraction failed.");
        }
      });

      // 2. Open the system browser
      await Browser.open({ url: authUrl });
    } catch (err) {
      reject("Failed to initialize mobile auth flow.");
    }
  });
};

declare global {
  interface Window {
    google: any;
  }
}

export const loginToGoogle = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) reject(response.error);
          else resolve(response.access_token);
        },
      });
      client.requestAccessToken();
    } catch (err) {
      reject("Google Identity script not loaded. Check your internet connection.");
    }
  });
};

// Finds the hidden backup file ID in the AppData folder
const getBackupFileId = async (accessToken: string): Promise<string | null> => {
  const query = encodeURIComponent(`name='${FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
};

export const pushToCloud = async (accessToken: string, backupData: string): Promise<boolean> => {
  const fileId = await getBackupFileId(accessToken);

  if (fileId) {
    // File exists: Update it via PATCH
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: backupData,
    });
    return res.ok;
  } else {
    // File does not exist: Create it via POST (Multipart)
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const metadata = { name: FILE_NAME, parents: ["appDataFolder"] };
    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      backupData +
      close_delim;

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });
    return res.ok;
  }
};

export const pullFromCloud = async (accessToken: string): Promise<string | null> => {
  const fileId = await getBackupFileId(accessToken);
  if (!fileId) return null; // No backup found

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) throw new Error("Failed to download file");
  return await res.text();
};