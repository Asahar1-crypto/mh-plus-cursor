import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, invitationId, password: providedPassword } = await req.json();
    
    console.log('Family registration request:', { name, email, phone, invitationId });

    if (!name || !email || !phone || !invitationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Initialize admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Check if user already exists - FIRST by phone (since invitation is phone-based), then by email.
    //    Avoid listUsers() without pagination (1000-user cap) – use targeted lookups instead.

    // Phone check: profiles table has phone_e164, then fetch the auth user by ID
    const { data: phoneProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_e164', phone)
      .maybeSingle();

    let existingUser = null;
    if (phoneProfile?.id) {
      const { data: userById } = await supabaseAdmin.auth.admin.getUserById(phoneProfile.id);
      existingUser = userById?.user ?? null;
      console.log('Found existing user by phone:', existingUser?.id, existingUser?.email);
    }

    // Email check: paginated listUsers to handle any DB size
    if (!existingUser) {
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data: pageData, error: pageError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (pageError || !pageData?.users?.length) break;
        const found = pageData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          existingUser = found;
          console.log('Found existing user by email:', existingUser.id);
          break;
        }
        if (pageData.users.length < perPage) break;
        page++;
      }
    }
    
    let userId: string;
    let isExistingUser = false;
    
    if (existingUser) {
      // User already exists - use their existing account
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;
      isExistingUser = true;
      
      // For family registration, ALWAYS update the phone to match the verified phone
      // This ensures the phone matches the invitation for validation
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          phone_number: phone,
          phone_e164: phone 
        })
        .eq('id', userId);
      
      if (profileUpdateError) {
        console.error('Profile phone update error:', profileUpdateError.message);
        // If update fails due to unique constraint, check if user already has this phone
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('phone_e164')
          .eq('id', userId)
          .single();
        
        if (existingProfile?.phone_e164 !== phone) {
          // Phone is different and can't be updated - might belong to another user
          return new Response(
            JSON.stringify({ error: 'מספר הטלפון כבר בשימוש על ידי משתמש אחר' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        // If phone matches, continue - profile already has correct phone
      } else {
        console.log('Profile phone updated to:', phone);
      }
    } else {
      // Create new user
      const generateSecurePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => chars[b % chars.length]).join('');
      };

      // Use provided password if valid (≥6 chars), otherwise generate one
      const password = (providedPassword && providedPassword.length >= 6)
        ? providedPassword
        : generateSecurePassword();

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          phone_number: phone
        }
      });

      if (authError) {
        console.error('Error creating user:', authError);
        return new Response(
          JSON.stringify({ error: `שגיאה ביצירת משתמש: ${authError.message}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!authData.user) {
        return new Response(
          JSON.stringify({ error: 'לא ניתן ליצור משתמש' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      userId = authData.user.id;
      console.log('User created successfully:', userId);
    }

    // 2. Update SMS verification codes with user_id
    const { error: smsUpdateError } = await supabaseAdmin
      .from('sms_verification_codes')
      .update({ user_id: userId })
      .eq('phone_number', phone)
      .eq('verified', true)
      .is('user_id', null);

    if (smsUpdateError) {
      console.error('Error updating SMS verification:', smsUpdateError);
    } else {
      console.log('SMS verification updated with user_id');
    }

    // 3. Accept the invitation and add user to account
    const { error: invitationError } = await supabaseAdmin.rpc('accept_invitation_and_add_member', {
      invitation_uuid: invitationId,
      user_uuid: userId
    });

    if (invitationError) {
      console.error('Error accepting invitation:', invitationError);
      
      // Only delete user if we just created them
      if (!isExistingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      
      return new Response(
        JSON.stringify({ error: `שגיאה בקבלת ההזמנה: ${invitationError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Invitation accepted successfully');

    // 4. Generate a one-time sign-in link for the user
    const appUrl = Deno.env.get('APP_URL') || 'https://mhplus.online';
    const redirectTo = `${appUrl}/dashboard`;
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo
      }
    });

    if (signInError) {
      console.error('Error generating magic link:', signInError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        userId: userId,
        email: email,
        isExistingUser: isExistingUser,
        magicLink: signInData?.properties?.action_link,
        message: isExistingUser 
          ? 'המשתמש נוסף לחשבון המשפחתי בהצלחה!'
          : 'הרישום הושלם בהצלחה! המשתמש נוסף לחשבון המשפחתי'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Family registration error:', error);
    return new Response(
      JSON.stringify({ error: 'שגיאה פנימית בשרת' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});