// Server component wrapper — exports dynamic so Next.js skips static prerender
export const dynamic = 'force-dynamic';

import { LoginPage } from './LoginPage';

export default function Page() {
  return <LoginPage />;
}
