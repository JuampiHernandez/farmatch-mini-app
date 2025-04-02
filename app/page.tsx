"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
  useNotification,
} from "@coinbase/onchainkit/minikit";
import { Name, Identity } from "@coinbase/onchainkit/identity";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Check from "./svg/Check";

interface Match {
  address: string;
  score: number;
  commonalities: string[];
}

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answers, setAnswers] = useState({
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
  const { login, authenticated, user, logout } = usePrivy();
  const sendNotification = useNotification();

  const fieldOrder = ['focus', 'ecosystem', 'project', 'approach', 'motto'];

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame, setFrameAdded]);

  const saveFrameButton = useMemo(() => {
    if (!authenticated) {
      return (
        <button
          type="button"
          onClick={() => login()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
        >
          Connect
        </button>
      );
    }

    if (context && !context.client.added) {
      return (
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleAddFrame}
            className="cursor-pointer bg-transparent font-semibold text-sm border border-purple-300 px-4 py-2 rounded-lg hover:bg-purple-50"
          >
            + Save Frame
          </button>
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
          >
            Disconnect
          </button>
        </div>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm font-semibold text-green-600 px-4 py-2">
            <Check />
            <span>Saved</span>
          </div>
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
          >
            Disconnect
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => logout()}
        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
      >
        Disconnect
      </button>
    );
  }, [context, handleAddFrame, frameAdded, authenticated, login, logout]);

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
    if (!authenticated) {
      login();
      return;
    }

    setAnswers(prev => ({
      ...prev,
      [fieldOrder[currentStep]]: answer
    }));
    
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          walletAddress: user?.wallet?.address || '',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
        if (data.noMatches) {
          setNoMatches(true);
          setNoMatchMessage(data.message);
        } else {
          setMatches(data.matches);
        }
        await sendNotification({
          title: "Profile Created! 🎉",
          body: data.noMatches ? data.message : "We found some matches for you!"
        });
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error("Failed to process profile:", error);
    }
  };

  const renderMatches = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-green-600 mb-6">Your Builder Matches! 🎉</h2>
        {matches.map((match) => (
          <div key={match.address} className="bg-white p-6 rounded-lg shadow-sm border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <Identity
                address={`0x${match.address.replace('0x', '')}`}
                className="!bg-inherit p-0 [&>div]:space-x-2"
              >
                <Name className="text-inherit" />
              </Identity>
              <span className="text-purple-600 font-semibold">
                {match.score}% Match
              </span>
            </div>
            <div className="space-y-2">
              {match.commonalities.map((common, i) => (
                <div key={i} className="text-sm text-gray-600 flex items-center">
                  <span className="mr-2">•</span>
                  {common}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (!authenticated) {
      return (
        <div className="text-center space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Connect your wallet to start</h2>
          <button
            onClick={() => login()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-base font-semibold"
          >
            Connect Wallet
          </button>
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
          <h2 className="text-xl font-semibold text-gray-800">Ready to find your match?</h2>
          <button
            onClick={() => setCurrentStep(0)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-base font-semibold"
          >
            Start Questionnaire
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
      <div className="w-screen max-w-[520px]">
        <header className="mr-2 mt-1 flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm rounded-lg m-4">
          <div className="justify-start">
            {authenticated ? (
              <div className="flex items-center space-x-2">
                {user?.wallet?.address && (
                  <Identity
                    address={`0x${user.wallet.address.replace('0x', '')}`}
                    className="!bg-inherit p-0 [&>div]:space-x-2"
                  >
                    <Name className="text-inherit" />
                  </Identity>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm font-semibold">
                Not Connected
              </div>
            )}
          </div>
          <div className="justify-end">{saveFrameButton}</div>
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
