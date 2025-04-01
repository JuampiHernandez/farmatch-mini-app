import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function POST(req: Request) {
  try {
    const { answers, walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Wallet address is required' 
      }, { status: 400 });
    }

    // Store user profile with wallet address as key
    await redis.hset(`user:${walletAddress}`, {
      ...answers,
      timestamp: Date.now(),
    });

    // Get all other users
    const users = await redis.keys('user:*');
    const matches = [];

    // Simple matching algorithm
    for (const userKey of users) {
      if (userKey === `user:${walletAddress}`) continue;
      
      const otherUser = await redis.hgetall(userKey);
      if (!otherUser) continue;

      // Calculate match score (simple version)
      let score = 0;
      if (answers.interests === otherUser.interests) score += 25;
      if (answers.vibes === otherUser.vibes) score += 25;
      if (answers.goals === otherUser.goals) score += 25;
      if (answers.availability === otherUser.availability) score += 25;

      if (score >= 50) { // Only include matches with >50% compatibility
        matches.push({
          address: userKey.split(':')[1],
          score,
        });
      }
    }

    // Sort matches by score
    matches.sort((a, b) => b.score - a.score);

    return NextResponse.json({ 
      success: true, 
      matches: matches.slice(0, 3) // Return top 3 matches
    });
  } catch (error) {
    console.error('Error in match route:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process matching' 
    }, { status: 500 });
  }
} 