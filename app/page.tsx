"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
  useNotification,
  useViewProfile,
} from "@coinbase/onchainkit/minikit";
import { Name, Identity } from "@coinbase/onchainkit/identity";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import Check from "./svg/Check";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    interests: "",
    vibes: "",
    goals: "",
    availability: ""
  });

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  const { address } = useAccount();
  const sendNotification = useNotification();
  const viewProfile = useViewProfile();

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
    if (context && !context.client.added) {
      return (
        <button
          type="button"
          onClick={handleAddFrame}
          className="cursor-pointer bg-transparent font-semibold text-sm"
        >
          + SAVE FRAME
        </button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-semibold animate-fade-out">
          <Check />
          <span>SAVED</span>
        </div>
      );
    }

    return null;
  }, [context, handleAddFrame, frameAdded]);

  const questions = [
    {
      title: "What are your main interests?",
      options: ["Tech & Web3", "Art & NFTs", "DeFi & Trading", "Social & Community"]
    },
    {
      title: "What's your vibe?",
      options: ["Builder/Maker", "Investor/Trader", "Content Creator", "Community Leader"]
    },
    {
      title: "What are you looking for?",
      options: ["Collaboration", "Mentorship", "Investment", "Friendship"]
    },
    {
      title: "How active are you on Farcaster?",
      options: ["Daily Caster", "Weekly Chatter", "Occasional Lurker", "Just Starting"]
    }
  ];

  const handleAnswer = (answer: string) => {
    const currentQuestion = questions[currentStep];
    setAnswers(prev => ({
      ...prev,
      [Object.keys(answers)[currentStep]]: answer
    }));
    
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Submit answers and find matches
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // Here we would normally send the data to our backend
    // For now, we'll just show a success notification
    try {
      await sendNotification({
        title: "Profile Created! 🎉",
        body: "We'll notify you when we find your matches!"
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen sm:min-h-[820px] font-sans bg-gradient-to-b from-purple-50 to-pink-50 text-black items-center relative">
      <div className="w-screen max-w-[520px]">
        <header className="mr-2 mt-1 flex justify-between">
          <div className="justify-start pl-1">
            {address ? (
              <Identity
                address={address}
                className="!bg-inherit p-0 [&>div]:space-x-2"
              >
                <Name className="text-inherit" />
              </Identity>
            ) : (
              <div className="pl-2 pt-1 text-gray-500 text-sm font-semibold">
                NOT CONNECTED
              </div>
            )}
          </div>
          <div className="pr-1 justify-end">{saveFrameButton}</div>
        </header>

        <main className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-purple-800 mb-2">FarMatch</h1>
            <p className="text-gray-600">Find your perfect Farcaster match</p>
          </div>

          {currentStep < questions.length ? (
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
                {questions[currentStep].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    className="w-full p-4 text-left rounded-lg border border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-green-600 mb-4">Profile Complete!</h2>
              <p className="text-gray-600 mb-6">We'll notify you when we find your matches.</p>
            </div>
          )}
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
