import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.push('/exampleUser');
  }, []);
  return <p>Redirecting...</p>;
}