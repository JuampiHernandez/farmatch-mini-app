import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

interface UserData {
  focus: string;
  ecosystem: string;
  project: string;
  approach: string;
  motto: string;
  timestamp: number;
}

interface Submission extends UserData {
  id: string;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-admin-secret';

export async function GET(req: Request) {
  try {
    // Basic auth check
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user keys
    const userKeys = await redis.keys('user:*');
    const submissions: Submission[] = [];

    // Fetch data for each user
    for (const key of userKeys) {
      const userData = await redis.hgetall(key) as UserData | null;
      if (userData) {
        submissions.push({
          id: key.split(':')[1],
          ...userData
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      submissions: submissions.sort((a, b) => b.timestamp - a.timestamp)
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch submissions' 
    }, { status: 500 });
  }
} 