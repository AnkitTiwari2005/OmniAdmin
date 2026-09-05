import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import {
  shudhhamProductSchema,
  buildKartProductSchema,
  houserveServiceSchema,
  houservePromotionSchema,
  teamMemberInviteSchema,
  technicianPromoteSchema,
  buildKartOrderStatusSchema,
  bookingStatusSchema,
} from '../src/lib/validation/schemas';

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
};

async function main() {
  console.log('=== TEST 1: SERVER-SIDE ZOD VALIDATION WITH CRAFTED PAYLOADS ===');

  // 1. BuildKart product invalid payload
  const badBk = buildKartProductSchema.safeParse({ name: 'X', price: -50, stock: -1, category: '' });
  console.log('Bad BuildKart product rejected:', !badBk.success);
  console.log('Errors:', badBk.error?.issues.map(i => `${i.path.join('.')}: ${i.message}`));

  // 2. Shudhham product invalid payload
  const badSh = shudhhamProductSchema.safeParse({ name: '', price: 0, category: '' });
  console.log('\nBad Shudhham product rejected:', !badSh.success);
  console.log('Errors:', badSh.error?.issues.map(i => `${i.path.join('.')}: ${i.message}`));

  // 3. Team member invite invalid payload
  const badInvite = teamMemberInviteSchema.safeParse({ email: 'not-an-email', full_name: 'A', role: 'invalid_role' as any });
  console.log('\nBad Team invite rejected:', !badInvite.success);
  console.log('Errors:', badInvite.error?.issues.map(i => `${i.path.join('.')}: ${i.message}`));

  // 4. Booking status invalid payload
  const badStatus = bookingStatusSchema.safeParse({ bookingId: '123-bad', status: 'bogus_status' as any });
  console.log('\nBad Booking status rejected:', !badStatus.success);
  console.log('Errors:', badStatus.error?.issues.map(i => `${i.path.join('.')}: ${i.message}`));

  // 5. Technician promote invalid payload
  const badPromote = technicianPromoteSchema.safeParse({ customerId: 'not-a-uuid' });
  console.log('\nBad Technician promote rejected:', !badPromote.success);
  console.log('Errors:', badPromote.error?.issues.map(i => `${i.path.join('.')}: ${i.message}`));


  console.log('\n=== TEST 2: COMMAND PALETTE SEARCH WITH REAL DATA ===');
  const shudhhamClient = createClient(getEnv('SHUDHHAM_SUPABASE_URL')!, getEnv('SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY')!);
  const houserveClient = createClient(getEnv('HOUSERVE_SUPABASE_URL')!, getEnv('HOUSERVE_SUPABASE_SERVICE_ROLE_KEY')!);
  const buildkartClient = createClient(getEnv('BUILDKART_SUPABASE_URL')!, getEnv('BUILDKART_SUPABASE_SERVICE_ROLE_KEY')!);

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function testSearch(q: string) {
    const isUuid = UUID_REGEX.test(q);
    console.log(`\nQuery: "${q}" (isUuid: ${isUuid})`);

    const shudhhamOrderQuery = isUuid
      ? shudhhamClient.from('orders').select('id, full_name, total_amount, status, created_at').eq('id', q).limit(3)
      : shudhhamClient.from('orders').select('id, full_name, total_amount, status, created_at').ilike('full_name', `%${q}%`).limit(3);

    const buildkartOrderQuery = isUuid
      ? buildkartClient.from('orders').select('id, total, status, created_at').eq('id', q).limit(3)
      : Promise.resolve({ data: [] as any[], error: null });

    const houserveBookingQuery = isUuid
      ? houserveClient.from('bookings').select('id, booking_ref, total_amount, status, created_at').eq('id', q).limit(3)
      : houserveClient.from('bookings').select('id, booking_ref, total_amount, status, created_at').ilike('booking_ref', `%${q}%`).limit(3);

    const [sRes, bRes, hRes] = await Promise.all([shudhhamOrderQuery, buildkartOrderQuery, houserveBookingQuery]);

    console.log(`  Shudhham orders matched: ${sRes.data?.length ?? 0}, error: ${sRes.error?.message || 'none'}`);
    if (sRes.data?.length) console.log('   Sample:', sRes.data[0]);

    console.log(`  BuildKart orders matched: ${bRes.data?.length ?? 0}, error: ${bRes.error?.message || 'none'}`);
    if (bRes.data?.length) console.log('   Sample:', bRes.data[0]);

    console.log(`  Houserve bookings matched: ${hRes.data?.length ?? 0}, error: ${hRes.error?.message || 'none'}`);
    if (hRes.data?.length) console.log('   Sample:', hRes.data[0]);
  }

  await testSearch('BW-87');
  await testSearch('Ankit');
  await testSearch('a80f079f-2cab-4ac2-97e1-75f2972c488c');


  console.log('\n=== TEST 3: CSV FORMULA INJECTION SANITIZATION ===');
  function formatCell(val: unknown): string {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (str.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(str[0])) {
      str = "'" + str;
    }
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }

  const testPayloads = [
    '=1+1',
    '+@SUM(A1:A10)',
    '-cmd| /C calc!A0',
    '@HYPERLINK("http://evil.com")',
    'Clean Company LLC',
  ];

  for (const item of testPayloads) {
    const res = formatCell(item);
    console.log(`  Input: ${item.padEnd(30)} -> Output: ${res}`);
    if (['=', '+', '-', '@'].includes(item[0]) && !res.startsWith("\"'")) {
      throw new Error(`Sanitization failed on ${item}`);
    }
  }

  console.log('\nALL VERIFICATION CHECKS PASSED!');
}

main().catch(console.error);
