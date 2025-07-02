
import { useState, useEffect } from 'react';

export const useOnboarding = () => {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setIsOnboardingActive(true);
    }
  }, []);

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const previousStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const skipOnboarding = () => {
    setIsOnboardingActive(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const completeOnboarding = () => {
    setIsOnboardingActive(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  return {
    isOnboardingActive,
    currentStep,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding
  };
};