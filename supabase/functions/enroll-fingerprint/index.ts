
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { fingerPrint, externalId, group } = await req.json();
    
    const response = await fetch('https://fingerprintapi.mxface.ai/api/FingerPrint/Enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Subscriptionkey': Deno.env.get('MXFACE_API_KEY') || '',
      },
      body: JSON.stringify({
        fingerPrint,
        externalId,
        group,
      }),
    });

    const data = await response.json();
    console.log('MxFace API Response:', data);

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
    return new Response(
      JSON.stringify({ 
        code: 500, 
        message: 'Internal Server Error',
        errorMessage: error.message 
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
