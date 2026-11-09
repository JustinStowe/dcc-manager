import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tokenHash = params.get('token_hash');
  // Only signup confirmations are accepted; destinations are fixed local paths.
  if (tokenHash && params.get('type') === 'email') {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (!error) redirect('/');
  }
  redirect('/login?error=confirmation');
}
