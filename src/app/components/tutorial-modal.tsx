import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Wallet, PlusCircle, Lightbulb, CloudUpload, X, ChevronRight, ChevronLeft } from "lucide-react";

const TUTORIAL_STEPS = [
  {
    icon: Wallet,
    title: "Welcome to Wealth Tracker",
    description: "Your offline-first, private personal finance command center. Let's take a quick tour!"
  },
  {
    icon: PlusCircle,
    title: "Log Transactions Effortlessly",
    description: "Tap the floating '+' button anywhere in the app to quickly log income, expenses, or auto-transfers."
  },
  {
    icon: Lightbulb,
    title: "Smart Analytics & Forecasting",
    description: "Check the Insights tab for dynamic budget health, category breakdowns, and end-of-month predictions."
  },
  {
    icon: CloudUpload,
    title: "You Own Your Data",
    description: "Your data lives safely on this device. Visit Settings to manually Push or Pull your backups to your personal cloud."
  }
];

export function TutorialModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if the user has already seen the tutorial
    const hasSeen = localStorage.getItem("hasSeenTutorial");
    if (!hasSeen) {
      setIsOpen(true);
    }
    
    // Listen for manual triggers from the Settings page
    const handleOpenTutorial = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener("open-tutorial", handleOpenTutorial);
    
    return () => window.removeEventListener("open-tutorial", handleOpenTutorial);
  }, []);

  const handleClose = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  if (!isOpen) return null;

  const StepIcon = TUTORIAL_STEPS[currentStep].icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card w-full max-w-sm rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Progress Bar & Close Button */}
          <div className="flex justify-between items-center p-4 border-b border-border/50">
            <div className="flex gap-1.5 pl-2">
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-primary/20'}`} />
              ))}
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X size={20} />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
              <StepIcon className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-3">{TUTORIAL_STEPS[currentStep].title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed h-16">
              {TUTORIAL_STEPS[currentStep].description}
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="p-6 pt-0 flex gap-3 mt-auto">
            <Button 
              variant="outline" 
              className={`flex-1 rounded-xl h-12 transition-opacity ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
              onClick={prevStep}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button 
              className="flex-1 rounded-xl h-12 font-semibold" 
              onClick={nextStep}
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? "Get Started" : "Next"} 
              {currentStep !== TUTORIAL_STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}