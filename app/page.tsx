import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to login for now (will be updated with auth check)
  redirect('/login');
}

