import { NextRequest, NextResponse } from 'next/server';
import { purgeBadActor } from '@/services/auth';
import { getSupabaseAdmin } from '@/services/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const badActorId = body.bad_actor_id || body.userId;

    if (!badActorId) {
      return NextResponse.json(
        { error: 'Wymagane ID użytkownika (bad_actor_id).' },
        { status: 400 }
      );
    }

    const result = await purgeBadActor(badActorId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/admin/purge-bad-actor error:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd podczas usuwania naruszeń bad actora.' },
      { status: 500 }
    );
  }
}

/**
 * GET: Lists active users and their barrier counts so admin / tester can see who to purge.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, nickname, email, created_at, is_banned')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ users: [] });
    }

    // Attach contribution count to each user
    const usersWithCount = await Promise.all(
      (users || []).map(async (u) => {
        const { count } = await supabase
          .from('barriers')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', u.id);
        return { ...u, contributions_count: count || 0 };
      })
    );

    return NextResponse.json({ users: usersWithCount });
  } catch (error: any) {
    return NextResponse.json({ users: [], error: error.message }, { status: 500 });
  }
}
