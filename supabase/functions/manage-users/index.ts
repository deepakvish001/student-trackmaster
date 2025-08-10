import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user is authenticated and get their data
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is super admin
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action, email, password, full_name, user_id, new_password, role } = body

    switch (action) {
      case 'create_user': {
        console.log('Creating user with data:', { email, full_name, role })
        
        // Validate required fields
        if (!email || !password || !full_name) {
          return new Response(
            JSON.stringify({ error: 'Email, password, and full name are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create new user using service role key (bypasses RLS)
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: full_name }
        })

        console.log('User creation result:', { newUser, createError })

        if (createError) {
          console.error('User creation error:', createError)
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create profile for new user using service role key
        const { data: profileData, error: profileError } = await supabaseClient
          .from('user_profiles')
          .insert({
            user_id: newUser.user.id,
            full_name: full_name,
            role: role || 'user',
            is_active: true
          })
          .select()

        console.log('Profile creation result:', { profileData, profileError })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Try to clean up the created user
          await supabaseClient.auth.admin.deleteUser(newUser.user.id)
          return new Response(
            JSON.stringify({ error: `Failed to create user profile: ${profileError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('User created successfully:', newUser.user.id)
        return new Response(
          JSON.stringify({ success: true, user: newUser.user, user_id: newUser.user.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_users': {
        // Get all users and their profiles
        const { data: profiles, error: profilesError } = await supabaseClient
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (profilesError) {
          return new Response(
            JSON.stringify({ error: profilesError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, users: profiles }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete_user': {
        // Prevent self-deletion
        if (user_id === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot delete your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Delete user from auth
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user_id)

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User deleted successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_password': {
        // Prevent self-password change
        if (user_id === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot change your own password from admin panel' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update user password
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          user_id,
          { password: new_password }
        )

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Password updated successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'toggle_status': {
        // Prevent self-status toggle
        if (user_id === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot change your own account status' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get current user status
        const { data: currentUser, error: getUserError } = await supabaseClient
          .from('user_profiles')
          .select('is_active')
          .eq('user_id', user_id)
          .single()

        if (getUserError) {
          return new Response(
            JSON.stringify({ error: getUserError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Toggle status
        const newStatus = !currentUser.is_active
        const { error: toggleError } = await supabaseClient
          .from('user_profiles')
          .update({ is_active: newStatus })
          .eq('user_id', user_id)

        if (toggleError) {
          return new Response(
            JSON.stringify({ error: toggleError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `User ${newStatus ? 'enabled' : 'disabled'} successfully`,
            newStatus 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'ban_user': {
        // Prevent self-ban
        if (user_id === user.id) {
          return new Response(
            JSON.stringify({ error: 'Cannot ban your own account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update user profile to inactive
        const { error: banError } = await supabaseClient
          .from('user_profiles')
          .update({ is_active: false })
          .eq('user_id', user_id)

        if (banError) {
          return new Response(
            JSON.stringify({ error: banError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User banned successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'unban_user': {
        // Update user profile to active
        const { error: unbanError } = await supabaseClient
          .from('user_profiles')
          .update({ is_active: true })
          .eq('user_id', user_id)

        if (unbanError) {
          return new Response(
            JSON.stringify({ error: unbanError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User unbanned successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})