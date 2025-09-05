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
    const { name, email, phone, invitationId } = await req.json();
    
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

    // 1. Generate a random password for the user
    const generateRandomPassword = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const password = generateRandomPassword();

    // 2. Create user with admin privileges (pre-confirmed email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // This automatically confirms the email!
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

    console.log('User created successfully:', authData.user.id);

    // 3. Update SMS verification codes with user_id
    const { error: smsUpdateError } = await supabaseAdmin
      .from('sms_verification_codes')
      .update({ user_id: authData.user.id })
      .eq('phone_number', phone)
      .eq('verified', true)
      .is('user_id', null);

    if (smsUpdateError) {
      console.error('Error updating SMS verification:', smsUpdateError);
    } else {
      console.log('SMS verification updated with user_id');
    }

    // 4. Accept the invitation and add user to account
    const { error: invitationError } = await supabaseAdmin.rpc('accept_invitation_and_add_member', {
      invitation_uuid: invitationId,
      user_uuid: authData.user.id
    });

    if (invitationError) {
      console.error('Error accepting invitation:', invitationError);
      
      // If invitation failed, clean up by deleting the user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return new Response(
        JSON.stringify({ error: `שגיאה בקבלת ההזמנה: ${invitationError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Invitation accepted successfully');

    // 5. Generate a one-time sign-in link for the user
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL').replace('supabase.co', 'vercel.app')}/dashboard`
      }
    });

    if (signInError) {
      console.error('Error generating magic link:', signInError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        userId: authData.user.id,
        email: email,
        magicLink: signInData?.properties?.action_link,
        message: 'הרישום הושלם בהצלחה! המשתמש נוסף לחשבון המשפחתי'
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