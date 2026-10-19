import { getSupabaseClient } from '../lib/supabaseClient';
import { makePushApi, type PushRpcClient } from '../../../src/push/pushApi';
export const ownerPushApi=makePushApi(()=>getSupabaseClient() as unknown as PushRpcClient);
