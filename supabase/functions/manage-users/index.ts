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
    const { action, email, password, full_name, user_id, new_password, role, batch_access, max_batches_allowed } = body

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

        // Update the automatically created profile (from trigger) with correct role
        const { data: profileData, error: profileError } = await supabaseClient
          .from('user_profiles')
          .update({
            full_name: full_name,
            role: role || 'user',
            is_active: true,
            max_batches_allowed: max_batches_allowed || 1
          })
          .eq('user_id', newUser.user.id)
          .select()

        console.log('Profile update result:', { profileData, profileError })

        if (profileError) {
          console.error('Profile update error:', profileError)
          // Try to clean up the created user
          await supabaseClient.auth.admin.deleteUser(newUser.user.id)
          return new Response(
            JSON.stringify({ error: `Failed to update user profile: ${profileError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // If user role is 'user' and batch_access is provided, create batch access records
        if (role === 'user' && batch_access && Array.isArray(batch_access) && batch_access.length > 0) {
          const batchAccessRecords = batch_access.map(batchId => ({
            user_id: newUser.user.id,
            batch_id: batchId,
            granted_by: user.id
          }));

          const { error: batchAccessError } = await supabaseClient
            .from('user_batch_access')
            .insert(batchAccessRecords);

          if (batchAccessError) {
            console.error('Batch access creation error:', batchAccessError);
            // Don't fail the user creation, just log the error
          }
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
        // Use optimized database function for profile deletion
        const { data: deleteResult, error: dbError } = await supabaseClient
          .rpc('delete_user_account', { target_user_id: user_id })

        if (dbError) {
          return new Response(
            JSON.stringify({ error: dbError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!deleteResult.success) {
          return new Response(
            JSON.stringify({ error: deleteResult.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Delete user from auth (this is required and cannot be done in database function)
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
        // Use optimized database function for atomic toggle
        const { data: toggleResult, error: toggleError } = await supabaseClient
          .rpc('toggle_user_status', { target_user_id: user_id })

        if (toggleError) {
          return new Response(
            JSON.stringify({ error: toggleError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!toggleResult.success) {
          return new Response(
            JSON.stringify({ error: toggleResult.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(toggleResult),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'ban_user': {
        // Use optimized database function
        const { data: banResult, error: banError } = await supabaseClient
          .rpc('update_user_status', { 
            target_user_id: user_id, 
            new_status: false 
          })

        if (banError) {
          return new Response(
            JSON.stringify({ error: banError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!banResult.success) {
          return new Response(
            JSON.stringify({ error: banResult.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User banned successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'unban_user': {
        // Use optimized database function
        const { data: unbanResult, error: unbanError } = await supabaseClient
          .rpc('update_user_status', { 
            target_user_id: user_id, 
            new_status: true 
          })

        if (unbanError) {
          return new Response(
            JSON.stringify({ error: unbanError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!unbanResult.success) {
          return new Response(
            JSON.stringify({ error: unbanResult.error }),
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