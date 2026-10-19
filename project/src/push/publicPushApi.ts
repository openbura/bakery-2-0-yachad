import { getBakerySupabaseClient } from '../lib/bakerySupabaseClient';
import { makePushApi } from './pushApi';
export const publicPushApi=makePushApi(getBakerySupabaseClient);
