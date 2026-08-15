// src/app/components/update-modal.tsx
import { useEffect, useState } from "react";
import { checkForUpdates, UpdateInfo } from "@/services/updater";
import { Button } from "./ui/button";
import { AlertOctagon, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function UpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Run the silent check in the background when the app boots
    const initCheck = async () => {
      const info = await checkForUpdates();
      if (info) setUpdateInfo(info);
    };
    initCheck();
  }, []);

  if (!updateInfo || dismissed) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Scrollable Content Area */}
          <div className="p-6 md:p-8 overflow-y-auto hide-scrollbar">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
              <AlertOctagon className="h-6 w-6" />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight mb-1">New version available!</h2>
            <p className="text-sm font-mono text-muted-foreground mb-6">{updateInfo.version}</p>

            {/* Changelog Rendering */}
            <div className="text-sm text-foreground/90 leading-relaxed mb-6 whitespace-pre-wrap">
              {updateInfo.notes || "Bug fixes and performance improvements."}
            </div>

            <a
              href={updateInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mb-2"
            >
              Open on GitHub <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Sticky Action Buttons */}
          <div className="p-6 pt-0 space-y-3 mt-auto bg-card">
            <Button
              className="w-full rounded-xl h-12 text-sm font-semibold"
              onClick={() => window.open(updateInfo.url, '_blank')}
            >
              Download Update
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl h-12 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setDismissed(true)}
            >
              Not now
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}