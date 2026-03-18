import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req: Request) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Verify the caller is an authenticated admin
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  // Check caller is admin
  const { data: callerProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  // CREATE USER
  if (action === 'create_user') {
    const { email, password, name, role } = body;

    if (!email?.endsWith('@alohaanimaloutreach.org')) {
      return new Response(
        JSON.stringify({ error: 'Email must end with @alohaanimaloutreach.org' }),
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400 }
      );
    }
    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { status: 400 }
      );
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
    }

    // Create users table row
    const { error: profileError } = await supabase.from('users').insert({
      id: newUser.user.id,
      email,
      name,
      role: role || 'coordinator',
    });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { status: 200 });
  }

  // RESET PASSWORD
  if (action === 'reset_password') {
    const { user_id, new_password } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
    }
    if (!new_password || new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // CHANGE ROLE
  if (action === 'change_role') {
    const { user_id, new_role } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
    }
    if (!['admin', 'coordinator'].includes(new_role)) {
      return new Response(JSON.stringify({ error: 'Role must be admin or coordinator' }), { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ role: new_role })
      .eq('id', user_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // LIST USERS
  if (action === 'list_users') {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ users }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
}

export const config = {
  path: '/.netlify/functions/admin-users',
};
