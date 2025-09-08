import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailChangeRequest {
  userId: string;
  newEmail: string;
  oldEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize regular client for auth check
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the request is from a super admin
    const { data: currentUser, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser.user) {
      return new Response(
        JSON.stringify({ error: 'אימות נכשל' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if current user is super admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', currentUser.user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'אין הרשאה - רק סופר אדמין יכול לבצע פעולה זו' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, newEmail, oldEmail }: EmailChangeRequest = await req.json();

    // Validate request data
    if (!userId || !newEmail || !oldEmail) {
      return new Response(
        JSON.stringify({ error: 'חסרים פרמטרים נדרשים: userId, newEmail, oldEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: 'פורמט המייל החדש אינו תקין' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if new email already exists using listUsers instead
    const { data: existingUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Error checking existing users:', listUsersError);
      return new Response(
        JSON.stringify({ error: 'שגיאה בבדיקת משתמשים קיימים' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if new email already exists
    const emailExists = existingUsers.users.some(user => user.email === newEmail);
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'המייל החדש כבר קיים במערכת' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details before change
    const { data: userToUpdate, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !userToUpdate.user) {
      return new Response(
        JSON.stringify({ error: 'המשתמש לא נמצא' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the old email matches
    if (userToUpdate.user.email !== oldEmail) {
      return new Response(
        JSON.stringify({ error: 'המייל הנוכחי אינו תואם' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user email in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true // מאשר את המייל החדש מיידית
    });

    if (updateError) {
      console.error('Error updating user email:', updateError);
      return new Response(
        JSON.stringify({ error: `שגיאה בעדכון המייל: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the change in audit_logs
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: currentUser.user.id,
        action: 'EMAIL_CHANGED_BY_ADMIN',
        table_name: 'auth.users',
        record_id: userId,
        old_data: { email: oldEmail },
        new_data: { email: newEmail },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    if (auditError) {
      console.error('Error logging to audit:', auditError);
      // לא נכשיל את הפעולה בגלל שגיאת רישום
    }

    // Send notification email to new address (optional)
    try {
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: newEmail,
          subject: 'כתובת המייל שלך שונתה',
          text: `שלום,\n\nכתובת המייל שלך במערכת שונתה מ-${oldEmail} ל-${newEmail}.\n\nאם לא ביקשת שינוי זה, אנא פנה אלינו מיידית.\n\nתודה,\nצוות המערכת`,
          html: `
            <h2>כתובת המייל שלך שונתה</h2>
            <p>שלום,</p>
            <p>כתובת המייל שלך במערכת שונתה:</p>
            <ul>
              <li><strong>מייל קודם:</strong> ${oldEmail}</li>
              <li><strong>מייל חדש:</strong> ${newEmail}</li>
            </ul>
            <p>אם לא ביקשת שינוי זה, אנא פנה אלינו מיידית.</p>
            <p>תודה,<br>צוות המערכת</p>
          `
        }
      });
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      // לא נכשיל את הפעולה בגלל שגיאת שליחת מייל
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'המייל שונה בהצלחה',
        userId,
        oldEmail,
        newEmail
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in change-user-email function:', error);
    return new Response(
      JSON.stringify({ error: 'שגיאה פנימית בשרת' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});