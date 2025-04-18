"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
  useNotification,
  useClose,
  useViewProfile,
} from "@coinbase/onchainkit/minikit";
import { useCallback, useEffect, useMemo, useState } from "react";
import Check from "./svg/Check";

interface Match {
  address: string;
  score: number;
  commonalities: string[];
}

interface UserAnswers {
  focus: string;
  ecosystem: string;
  project: string;
  approach: string;
  motto: string;
}

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [currentStep, setCurrentStep] = useState(-1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answers, setAnswers] = useState<UserAnswers>({
    focus: "",
    ecosystem: "",
    project: "",
    approach: "",
    motto: ""
  });
  const [matches, setMatches] = useState<Match[]>([]);
  const [noMatches, setNoMatches] = useState(false);
  const [noMatchMessage, setNoMatchMessage] = useState('');

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  const sendNotification = useNotification();
  const close = useClose();
  const viewProfile = useViewProfile();

  const fieldOrder = ['focus', 'ecosystem', 'project', 'approach', 'motto'];

  // Debug logging
  console.log('Debug - Context:', {
    context,
    isFrameReady,
    user: context?.user,
    client: context?.client
  });

  // Check if we're in a Farcaster frame context
  const isInFrame = isFrameReady && Boolean(context?.user?.fid);
  const userAddress = context?.user?.username || '';
  const isFrameAdded = Boolean(context?.client?.added);

  useEffect(() => {
    console.log('Effect running - isFrameReady:', isFrameReady);
    if (!isFrameReady) {
      console.log('Setting frame ready...');
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    await addFrame();
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (!isInFrame) {
      return null;
    }

    if (!isFrameAdded) {
      return (
        <button
          type="button"
          onClick={handleAddFrame}
          className="cursor-pointer bg-transparent font-semibold text-sm border border-purple-300 px-4 py-2 rounded-lg hover:bg-purple-50"
        >
          + Save Frame
        </button>
      );
    }

    return (
      <div className="flex items-center space-x-1 text-sm font-semibold text-green-600 px-4 py-2">
        <Check />
        <span>Saved</span>
      </div>
    );
  }, [handleAddFrame, isFrameAdded, isInFrame]);

  const questions = [
    {
      title: "What's your primary focus in Web3?",
      options: ["Full-stack Development", "Smart Contracts", "Frontend/UX", "Protocol Design"]
    },
    {
      title: "Which ecosystem do you primarily build in?",
      options: ["OP Stack", "Ethereum", "Solana", "ZK stcak"]
    },
    {
      title: "What type of project interests you most?",
      options: ["DeFi Protocols", "Social dApps", "Infrastructure", "Developer Tools"]
    },
    {
      title: "Your preferred development approach?",
      options: ["Move Fast & Ship", "Security First", "User-Centric", "Research Driven"]
    },
    {
      title: "Which phrase describes you best?",
      options: ["Show, don't tell", "Let's fucking build!", "Still day one", "Just build it"]
    }
  ];

  const handleAnswer = async (answer: string) => {
    if (!isInFrame) {
      return;
    }

    const field = fieldOrder[currentStep];
    console.log(`[Step ${currentStep + 1}/${questions.length}] Setting ${field} to:`, answer);
    
    // Set answers first
    const newAnswers = {
      ...answers,
      [field]: answer
    };
    setAnswers(newAnswers);
    
    // Then handle submission or next step
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // For the last question, submit with the updated answers
      await handleSubmit(newAnswers);
    }
  };

  const handleSubmit = async (finalAnswers = answers) => {
    try {
      const payload = {
        answers: finalAnswers,
        walletAddress: userAddress,
      };
      console.log('Submitting payload:', payload);

      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!data.success) {
        console.error('Server reported error:', data.error);
        throw new Error(data.error || 'Failed to save profile');
      }

      setIsSubmitted(true);
      if (data.noMatches) {
        setNoMatches(true);
        setNoMatchMessage(data.message);
      } else {
        setMatches(data.matches);
      }
      
      if (context?.client?.added) {
        await sendNotification({
          title: "Profile Created! 🎉",
          body: data.noMatches ? data.message : "We found some matches for you!"
        });
      }
    } catch (error) {
      console.error("Failed to process profile:", error);
    }
  };

  // Add a helper function to truncate text
  const truncateText = (text: string, maxLength: number = 15) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  const renderMatches = () => {
    const matchedUsernames = matches.map(match => match.address.split('.')[0]).join(', @');
    const castText = `I just used Farmatch from @juampi, and got matched with @${matchedUsernames}`;
    const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}`;

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-green-600 mb-6">Your Builder Matches! 🎉</h2>
        {matches.map((match) => {
          const username = match.address.split('.')[0]; // Remove .eth or any other suffix
          const warpcastUrl = `https://warpcast.com/${username}`;

          return (
            <div key={match.address} className="bg-white p-6 rounded-lg shadow-sm border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-800 font-medium">
                  @{truncateText(match.address)}
                </span>
                <span className="text-purple-600 font-semibold">
                  {match.score}% Match
                </span>
              </div>
              <button
                onClick={() => openUrl(warpcastUrl)}
                className="w-full py-2 px-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 font-medium text-sm"
              >
                Contact Builder
              </button>
            </div>
          );
        })}
        
        <div className="mt-8 text-center">
          <button
            onClick={() => openUrl(castUrl)}
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium text-sm"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Share on Farcaster
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!isInFrame) {
      return (
        <div className="text-center space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Please open this app in Farcaster</h2>
        </div>
      );
    }

    if (isSubmitted) {
      if (noMatches) {
        return (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-purple-600">Thanks for submitting! 🎉</h2>
            <p className="text-gray-600">{noMatchMessage}</p>
          </div>
        );
      }
      return renderMatches();
    }

    if (currentStep === -1) {
      return (
        <div className="text-center space-y-6">
          <button
            onClick={() => setCurrentStep(0)}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-lg font-semibold"
          >
            Start
          </button>
        </div>
      );
    }

    if (currentStep < questions.length) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{questions[currentStep].title}</h2>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-4">
              <div 
                className="h-full bg-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="space-y-3">
            {questions[currentStep].options.map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                className="w-full p-4 text-left rounded-lg border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col min-h-screen sm:min-h-[820px] font-sans bg-gradient-to-b from-purple-50 to-pink-50 text-black items-center relative">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Outfit', sans-serif;
        }
      `}</style>

      <div className="w-screen max-w-[520px]">
        <header className="mr-2 mt-1 flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm rounded-lg m-4">
          <div className="justify-start">
            {isInFrame && (
              <div className="flex items-center space-x-2">
                {userAddress && (
                  <button
                    onClick={() => viewProfile()}
                    className="text-gray-800 font-medium truncate max-w-[200px] hover:text-purple-600"
                  >
                    {truncateText(context?.user?.displayName || userAddress)}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {saveFrameButton}
            <button
              type="button"
              onClick={close}
              className="cursor-pointer bg-transparent font-semibold text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-purple-800 mb-2">FarMatch</h1>
            <p className="text-gray-600">Find your perfect Farcaster match</p>
          </div>

          {renderContent()}
        </main>

        <footer className="absolute bottom-4 flex items-center w-screen max-w-[520px] justify-center">
          <button
            type="button"
            className="mt-4 px-2 py-1 flex justify-start rounded-2xl font-semibold opacity-40 border border-black text-xs"
            onClick={() => openUrl("https://base.org/builders/minikit")}
          >
            BUILT WITH MINIKIT
          </button>
        </footer>
      </div>
    </div>
  );
}
