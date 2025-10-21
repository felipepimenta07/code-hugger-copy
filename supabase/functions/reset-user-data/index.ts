import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Starting user data reset for user:', user.id)

    // Delete all user data in correct order (due to foreign keys)
    console.log('Deleting connections...')
    const { error: connError } = await supabaseClient
      .from('connections')
      .delete()
      .eq('user_id', user.id)
    if (connError) console.error('Error deleting connections:', connError)

    // Get IDs first for junction tables
    const { data: peopleIds } = await supabaseClient
      .from('people')
      .select('id')
      .eq('user_id', user.id)

    const { data: brandIds } = await supabaseClient
      .from('brands')
      .select('id')
      .eq('user_id', user.id)

    const { data: projectIds } = await supabaseClient
      .from('projects')
      .select('id')
      .eq('user_id', user.id)

    // Delete junction table records
    if (peopleIds && peopleIds.length > 0) {
      console.log('Deleting person_workflows...')
      await supabaseClient
        .from('person_workflows')
        .delete()
        .in('person_id', peopleIds.map(p => p.id))
    }

    if (brandIds && brandIds.length > 0) {
      console.log('Deleting brand_workflows...')
      await supabaseClient
        .from('brand_workflows')
        .delete()
        .in('brand_id', brandIds.map(b => b.id))
    }

    if (projectIds && projectIds.length > 0) {
      console.log('Deleting project_workflows...')
      await supabaseClient
        .from('project_workflows')
        .delete()
        .in('project_id', projectIds.map(p => p.id))
    }

    // Delete main tables
    console.log('Deleting people...')
    await supabaseClient
      .from('people')
      .delete()
      .eq('user_id', user.id)

    console.log('Deleting brands...')
    await supabaseClient
      .from('brands')
      .delete()
      .eq('user_id', user.id)

    console.log('Deleting projects...')
    await supabaseClient
      .from('projects')
      .delete()
      .eq('user_id', user.id)

    console.log('Deleting workflows...')
    await supabaseClient
      .from('workflows')
      .delete()
      .eq('user_id', user.id)

    console.log('Resetting onboarding...')
    await supabaseClient
      .from('profiles')
      .update({ onboarding_completed: false })
      .eq('id', user.id)

    console.log('User data reset complete!')

    return new Response(
      JSON.stringify({ success: true, message: 'All user data has been reset' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error resetting user data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
