// src/app/services/updater.ts

export interface UpdateInfo {
  version: string;
  notes: string;
  url: string;
}

// ⚠️ IMPORTANT: Update this variable every time you compile a new release!
export const CURRENT_VERSION = "1.0.2"; // Example: Make sure this matches your current build

const REPO_OWNER = "your-github-username";
const REPO_NAME = "your-repo-name";

export const checkForUpdates = async (): Promise<UpdateInfo | null> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
    if (!response.ok) return null;
    const data = await response.json();

    if (data.tag_name) {
      // Clean both strings: remove 'v', spaces, and make lowercase
      const cleanGitHubVersion = data.tag_name.replace(/[^0-9.]/g, '');
      const cleanLocalVersion = CURRENT_VERSION.replace(/[^0-9.]/g, '');

      // Compare the cleaned numbers (e.g., "0.1.2" !== "0.1.2")
      if (cleanGitHubVersion !== cleanLocalVersion) {
        const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
        const directDownloadUrl = apkAsset ? apkAsset.browser_download_url : data.html_url;

        return {
          version: data.tag_name,
          notes: data.body,
          url: directDownloadUrl 
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    return null;
  }
};