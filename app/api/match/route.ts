import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

interface UserAnswers {
  focus: string;      // Primary focus in Web3
  ecosystem: string;  // Ecosystem they build in
  project: string;    // Project type interest
  approach: string;   // Development approach
  motto: string;      // Phrase that describes them
}

interface Match {
  address: string;
  score: number;
  commonalities: string[];
}

interface StoredUser extends UserAnswers {
  timestamp: number;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

function calculateMatchScore(userAddress: string, userAnswers: UserAnswers, otherAnswers: StoredUser): Match {
  let score = 0;
  const commonalities: string[] = [];

  // Primary focus (30 points)
  // Exact match or complementary skills
  const complementarySkills: { [key: string]: string[] } = {
    "Frontend/UX": ["Smart Contracts", "Protocol Design"],
    "Smart Contracts": ["Frontend/UX", "Protocol Design"],
    "Protocol Design": ["Smart Contracts", "Frontend/UX"],
    "Full-stack Development": ["Smart Contracts", "Protocol Design", "Frontend/UX"]
  };

  if (userAnswers.focus === otherAnswers.focus) {
    score += 30;
    commonalities.push(`Both focused on ${userAnswers.focus}`);
  } else if (complementarySkills[userAnswers.focus]?.includes(otherAnswers.focus)) {
    score += 25;
    commonalities.push(`Complementary skills: ${userAnswers.focus} + ${otherAnswers.focus}`);
  }

  // Ecosystem (25 points)
  if (userAnswers.ecosystem === otherAnswers.ecosystem) {
    score += 25;
    commonalities.push(`Both build on ${userAnswers.ecosystem}`);
  }

  // Project type (20 points)
  if (userAnswers.project === otherAnswers.project) {
    score += 20;
    commonalities.push(`Both interested in ${userAnswers.project}`);
  }

  // Development approach (15 points)
  if (userAnswers.approach === otherAnswers.approach) {
    score += 15;
    commonalities.push(`Similar development approach: ${userAnswers.approach}`);
  }

  // Motto/Philosophy (10 points)
  if (userAnswers.motto === otherAnswers.motto) {
    score += 10;
    commonalities.push(`Share the same motto: ${userAnswers.motto}`);
  }

  return {
    address: userAddress,
    score,
    commonalities
  };
}

export async function POST(req: Request) {
  try {
    const { answers, walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Wallet address is required' 
      }, { status: 400 });
    }

    const userAnswers: UserAnswers = {
      focus: answers[Object.keys(answers)[0]],
      ecosystem: answers[Object.keys(answers)[1]],
      project: answers[Object.keys(answers)[2]],
      approach: answers[Object.keys(answers)[3]],
      motto: answers[Object.keys(answers)[4]]
    };

    // Store user profile with wallet address as key
    await redis.hset(`user:${walletAddress}`, {
      ...userAnswers,
      timestamp: Date.now(),
    });

    // Get all other users
    const users = await redis.keys('user:*');
    const matches: Match[] = [];

    // Skip matching if there's only one user
    if (users.length <= 1) {
      return NextResponse.json({ 
        success: true,
        noMatches: true,
        message: "You're one of the first builders here! Check back soon for matches."
      });
    }

    // Find matches
    for (const userKey of users) {
      if (userKey === `user:${walletAddress}`) continue;
      
      const rawUser = await redis.hgetall(userKey);
      if (!rawUser) continue;

      // Convert raw data to StoredUser type
      const otherUser: StoredUser = {
        focus: String(rawUser.focus),
        ecosystem: String(rawUser.ecosystem),
        project: String(rawUser.project),
        approach: String(rawUser.approach),
        motto: String(rawUser.motto),
        timestamp: Number(rawUser.timestamp)
      };

      const matchResult = calculateMatchScore(
        userKey.split(':')[1],
        userAnswers,
        otherUser
      );
      
      if (matchResult.score >= 40) { // Only include matches with >40% compatibility
        matches.push(matchResult);
      }
    }

    // Sort matches by score
    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return NextResponse.json({ 
        success: true,
        noMatches: true,
        message: "No matches found yet. You have a unique builder profile! We'll notify you when we find compatible builders."
      });
    }

    return NextResponse.json({ 
      success: true,
      matches: matches.slice(0, 3), // Return top 3 matches
      noMatches: false
    });
  } catch (error) {
    console.error('Error in match route:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process matching' 
    }, { status: 500 });
  }
} 