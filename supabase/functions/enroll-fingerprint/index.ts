import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation function
const validateInput = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.fingerPrint || typeof data.fingerPrint !== 'string') {
    errors.push('Invalid fingerprint data');
  } else if (data.fingerPrint.length < 100) {
    errors.push('Fingerprint data appears to be incomplete');
  }
  
  if (!data.externalId || typeof data.externalId !== 'string') {
    errors.push('External ID is required');
  } else if (data.externalId.length > 100) {
    errors.push('External ID is too long');
  }
  
  if (!data.group || typeof data.group !== 'string') {
    errors.push('Group is required');
  } else if (data.group.length > 50) {
    errors.push('Group name is too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Security logging function
const logSecurityEvent = (event: string, details: any = {}) => {
  console.log(`[SECURITY] ${event}:`, {
    timestamp: new Date().toISOString(),
    ...details
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Only allow POST requests
    if (req.method !== 'POST') {
      logSecurityEvent('Invalid HTTP method attempted', { method: req.method });
      return new Response(
        JSON.stringify({ 
          code: 405, 
          message: 'Method Not Allowed',
          errorMessage: 'Only POST requests are allowed' 
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          status: 405,
        },
      );
    }

    // Authentication: require valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ code: 401, message: 'Unauthorized', errorMessage: 'Authentication required' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 401 },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      logSecurityEvent('Invalid JWT token', { error: userError?.message });
      return new Response(
        JSON.stringify({ code: 401, message: 'Unauthorized', errorMessage: 'Invalid authentication' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 401 },
      );
    }

    const requestData = await req.json();
    
    // Validate and sanitize input
    const validation = validateInput(requestData);
    if (!validation.isValid) {
      logSecurityEvent('Invalid input data', { errors: validation.errors });
      return new Response(
        JSON.stringify({ 
          code: 400, 
          message: 'Bad Request',
          errorMessage: validation.errors.join(', ')
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          status: 400,
        },
      );
    }
    
    const { fingerPrint, externalId, group } = requestData;
    
    // Security: Check for API key
    const apiKey = Deno.env.get('MXFACE_API_KEY');
    if (!apiKey) {
      logSecurityEvent('Missing API key configuration');
      return new Response(
        JSON.stringify({ 
          code: 500, 
          message: 'Internal Server Error',
          errorMessage: 'API key not configured' 
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          status: 500,
        },
      );
    }
    
    console.log(`Enrolling fingerprint for externalId: ${externalId} in group: ${group} by user: ${userData.user.id}`);
    console.log(`Fingerprint template length: ${fingerPrint.length}`);
    
    // Enhanced error handling for API call
    const response = await fetch('https://fingerprintapi.mxface.ai/api/FingerPrint/Enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Subscriptionkey': apiKey,
      },
      body: JSON.stringify({
        fingerPrint,
        externalId,
        group,
      }),
    });

    if (!response.ok) {
      logSecurityEvent('MxFace API error', { 
        status: response.status, 
        statusText: response.statusText 
      });
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('MxFace API Response:', data);

    // Log successful enrollment
    logSecurityEvent('Fingerprint enrolled successfully', { 
      externalId,
      group,
      userId: userData.user.id,
      responseCode: data.code 
    });

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      },
    );
  } catch (error) {
    console.error('Error:', error);
    logSecurityEvent('Fingerprint enrollment failed', { error: (error as Error).message });
    
    return new Response(
      JSON.stringify({ 
        code: 500, 
        message: 'Internal Server Error',
        errorMessage: 'Failed to process fingerprint enrollment'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 500,
      },
    );
  }
});
