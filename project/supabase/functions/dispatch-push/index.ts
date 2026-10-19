// Server only. This function has NOT been deployed. Runtime imports are pinned.
import { createClient } from 'npm:@supabase/supabase-js@2.110.2';
import webpush from 'npm:web-push@3.6.7';
import { createDispatchHandler, drainPush, makePushSender } from '../_shared/push-dispatch.mjs';

const handler = createDispatchHandler({
  secret: Deno.env.get('BAKERY_PUSH_WORKER_SECRET'),
  run: async () => {
    const url = Deno.env.get('SUPABASE_URL');
    if (url !== 'https://utyzqpjjjwjkkdlepkag.supabase.co') throw new Error('Wrong project');
    const privateKey = Deno.env.get('BAKERY_PUSH_VAPID_PRIVATE_KEY');
    const publicKey = Deno.env.get('BAKERY_PUSH_VAPID_PUBLIC_KEY');
    const send = makePushSender({ webpush, vapid: { publicKey, privateKey, subject: Deno.env.get('BAKERY_PUSH_VAPID_SUBJECT') } });
    const client = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const { data, error } = await client.rpc(name, args).abortSignal(AbortSignal.timeout(10000));
      if (error) throw new Error('Push database operation failed');
      return data;
    };
    return drainPush({ rpc, send, publicKey });
  },
});
Deno.serve(handler);
