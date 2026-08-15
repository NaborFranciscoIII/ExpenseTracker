// src/app/services/updater.ts

export interface UpdateInfo {
  version: string;
  notes: string;
  url: string;
}

// ⚠️ IMPORTANT: Update this variable every time you compile a new release!
export const CURRENT_VERSION = "v0.0.1"; 

// ⚠️ Replace with your actual GitHub repository details
const REPO_OWNER = "NaborFranciscoIII";
const REPO_NAME = "ExpenseTracker";

export const checkForUpdates = async (): Promise<UpdateInfo | null> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
    
    if (!response.ok) return null;
    
    const data = await response.json();

    // If the latest GitHub tag does not match our current version, an update is available!
    if (data.tag_name && data.tag_name !== CURRENT_VERSION) {
      return {
        version: data.tag_name,
        notes: data.body, // The markdown changelog you write on GitHub
        url: data.html_url // The link to the release page containing the .apk or .msi
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    return null;
  }
};