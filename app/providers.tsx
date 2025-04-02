"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
// import { PrivyProvider } from '@privy-io/react-auth';

export function Providers(props: { children: ReactNode }) {
  return (
    // Commenting out Privy for now as we're using Farcaster native auth
    // <PrivyProvider
    //   appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
    //   config={{
    //     loginMethods: ['email', 'wallet'],
    //     appearance: {
    //       theme: 'light',
    //       accentColor: '#8B5CF6',
    //       showWalletLoginFirst: true,
    //     },
    //   }}
    // >
      <MiniKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
        config={{
          appearance: {
            mode: "auto",
            theme: "snake",
            name: "FarMatch",
            logo: process.env.NEXT_PUBLIC_ICON_URL,
          },
        }}
      >
        {props.children}
      </MiniKitProvider>
    // </PrivyProvider>
  );
}
