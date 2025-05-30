import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    elo: 0,
    netElo: 0,
    logo: 'coal.png',
    avgTime: 'N/A',
  });
  const [latestMatchId, setLatestMatchId] = useState(null);
  const overlayRef = useRef();

  useEffect(() => {
    if (!router.isReady || !username) return;

    const fetchData = async () => {
      try {
        const userRes = await fetch(`https://api.mcsrranked.com/users/${username}`);
        const userData = await userRes.json();
        const elo = userData?.data?.eloRate || 0;
        const uuid = userData?.data?.uuid;

        const logo =
          elo < 600 ? 'coal.png' :
          elo < 900 ? 'iron.png' :
          elo < 1200 ? 'gold.png' :
          elo < 1500 ? 'emerald.png' :
          elo < 2000 ? 'diamond.png' : 'netherite.png';

        const matchRes = await fetch(`https://api.mcsrranked.com/users/${username}/matches?MatchType=1`);
        const matchData = await matchRes.json();
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / 1000;

        let wins = 0, losses = 0, netElo = 0;
        let totalTime = 0, validMatchCount = 0;
        let newMatchId = null;

        // Filter by date and type 2 only
        const todayMatches = matchData.data?.filter(
          match => match.date >= todayStart && match.type === 2
        );

        if (todayMatches?.length > 0) {
          newMatchId = todayMatches[0].id;
        }

        todayMatches?.forEach(match => {
          const changeData = match.changes?.find(c => c.uuid === uuid);
          const time = match.result?.time;

          // Count wins/losses and netElo regardless of forfeited
          if (changeData && typeof changeData.change === 'number') {
            if (changeData.change > 0) wins++;
            else if (changeData.change < 0) losses++;
            netElo += changeData.change;

            // Count time only for non-forfeited wins
            if (
              changeData.change > 0 &&
              match.forfeited === false &&
              typeof time === 'number' &&
              time > 0
            ) {
              totalTime += time;
              validMatchCount++;
            }
          }
        });

        // Format Avg Time
        let formattedAvgTime = "N/A";
        if (validMatchCount > 0) {
          const avgTimeSec = Math.round(totalTime / validMatchCount / 1000);
          const minutes = Math.floor(avgTimeSec / 60);
          const seconds = avgTimeSec % 60;
          formattedAvgTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Animate on new match
        if (newMatchId && newMatchId !== latestMatchId && overlayRef.current) {
          const lastChange = todayMatches[0].changes?.find(c => c.uuid === uuid)?.change || 0;
          overlayRef.current.style.backgroundColor =
            lastChange > 0 ? 'limegreen' : lastChange < 0 ? 'red' : 'gray';
          overlayRef.current.textContent =
            lastChange > 0 ? 'Win!' : lastChange < 0 ? 'Loss :(' : 'Draw';
          overlayRef.current.style.top = '0';

          setTimeout(() => {
            overlayRef.current.style.top = '-100%';
          }, 2000);

          setLatestMatchId(newMatchId);
        }

        setStats({ wins, losses, elo, netElo, logo, avgTime: formattedAvgTime });
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [router.isReady, username, latestMatchId]);

  return (
    <div
      style={{
        width: '300px',
        height: '200px',
        backgroundColor: '#102C30',
        color: 'limegreen',
        fontFamily: 'Minecraft, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div id="overlay" ref={overlayRef}></div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <img src={`/${stats.logo}`} alt="logo" width="64" height="64" />
        <div style={{ textAlign: 'left' }}>
          <p>Wins:{stats.wins}</p>
          <p style={{ color: 'red' }}>Loss:{stats.losses}</p>
          <p>Elo:{stats.elo}</p>
          <p>Net Elo:{stats.netElo}</p>
          <p>Avg Time:{stats.avgTime}</p>
        </div>
      </div>
    </div>
  );
}
