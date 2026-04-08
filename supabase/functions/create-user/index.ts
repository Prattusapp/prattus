import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const userCreationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(3),
  whatsapp: z.string().optional(),
  role: z.string(),
  crn: z.string().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Cabeçalho de autorização ausente')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !requester) throw new Error('Não autenticado ou sessão expirada')

    const { data: requesterProfile } = await supabaseClient
      .from('profiles')
      .select('role, institution_id')
      .eq('id', requester.id)
      .single()

    if (requesterProfile?.role !== 'gerente') {
      throw new Error('Apenas gerentes podem cadastrar novos usuários')
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Valida o payload de injeção através do Schema do Zod
    const rawBody = await req.json();
    const parsedData = userCreationSchema.parse(rawBody);

    const { email, password, full_name, whatsapp, role, crn } = parsedData;

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name, 
        whatsapp, 
        crn,
        role, 
        require_password_change: true,
        institution_id: requesterProfile?.institution_id 
      }
    })

    if (createError) throw createError

    // Atualiza o perfil correspondente
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ 
        full_name, 
        whatsapp, 
        crn,
        role, 
        require_password_change: true,
        email: email,
        institution_id: requesterProfile?.institution_id
      })
      .eq('id', newUser.user.id)

    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    let errorMessage = error.message;
    // Captura erros de parsing do Zod especificamente
    if (error instanceof z.ZodError) {
      errorMessage = "Erro de validação nos dados fornecidos: " + error.errors.map(e => e.message).join(', ');
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
