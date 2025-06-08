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
  const [hasGreeted, setHasGreeted] = useState(false);
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

        // ✅ Local start and end of day in milliseconds
        const localMidnight = new Date();
        localMidnight.setHours(0, 0, 0, 0); // 00:00:00 local
        const startOfDay = Math.floor(localMidnight.getTime() / 1000);
        const endOfDay = startOfDay + 86400 - 1;


        let wins = 0, losses = 0, netElo = 0;
        let totalTime = 0, validMatchCount = 0;
        let newMatchId = null;

        const todayMatches = matchData.data?.filter(
          match => match.date >= startOfDay && match.date <= endOfDay && match.type === 2
        );

        // "Hello!" greeting once per load if no matches today
        if (!hasGreeted && latestMatchId === null && todayMatches.length === 0 && overlayRef.current) {
          setHasGreeted(true);

          overlayRef.current.style.display = 'flex';
          overlayRef.current.style.backgroundColor = 'hotpink';
          overlayRef.current.textContent = 'Hello!';
          overlayRef.current.style.transform = 'translateY(0%)';

          setTimeout(() => {
            overlayRef.current.style.transform = 'translateY(-100%)';
            setTimeout(() => {
              overlayRef.current.textContent = 'Win!';
              overlayRef.current.style.backgroundColor = 'limegreen';
            }, 400);
          }, 2000);
        }

        if (todayMatches?.length > 0) {
          newMatchId = todayMatches[0].id;
        }

        todayMatches?.forEach(match => {
          const changeData = match.changes?.find(c => c.uuid === uuid);
          const time = match.result?.time;

          if (changeData && typeof changeData.change === 'number') {
            if (changeData.change > 0) wins++;
            else if (changeData.change < 0) losses++;
            netElo += changeData.change;

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

        let formattedAvgTime = "N/A";
        if (validMatchCount > 0) {
          const avgTimeSec = Math.round(totalTime / validMatchCount / 1000);
          const minutes = Math.floor(avgTimeSec / 60);
          const seconds = avgTimeSec % 60;
          formattedAvgTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        if (newMatchId && newMatchId !== latestMatchId && overlayRef.current) {
          const lastChange = todayMatches[0].changes?.find(c => c.uuid === uuid)?.change || 0;

          overlayRef.current.style.display = 'flex';
          overlayRef.current.style.backgroundColor =
            lastChange > 0 ? 'limegreen' : lastChange < 0 ? 'red' : 'gray';
          overlayRef.current.textContent =
            lastChange > 0 ? 'Win!' : lastChange < 0 ? 'Loss :(' : 'Draw';
          overlayRef.current.style.transform = 'translateY(0%)';

          setTimeout(() => {
            overlayRef.current.style.transform = 'translateY(-100%)';
            setTimeout(() => {
              overlayRef.current.textContent = 'Win!';
              overlayRef.current.style.backgroundColor = 'limegreen';
            }, 400);
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
  }, [router.isReady, username, latestMatchId, hasGreeted]);

  return (
    <div
      style={{
        width: '300px',
        height: '160px',
        backgroundColor: '#0a221c',
        fontFamily: 'Minecraft, sans-serif',
        color: 'white',
        border: '5px solid #00cc66',
        borderRadius: '10px',
        position: 'absolute',
        top: 0,
        left: 0,
        padding: '10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div id="overlay" ref={overlayRef}></div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <img src={`/${stats.logo}`} alt="logo" width="48" height="48" style={{ marginRight: '10px' }} />
        <div style={{ fontSize: '14px', color: '#99ffcc' }}><strong>Elo:</strong> {stats.elo}</div>
      </div>

      <div
        style={{
          backgroundColor: '#000000',
          padding: '8px',
          borderRadius: '8px',
          width: '100%',
          fontSize: '12px',
          lineHeight: '1.4',
        }}
      >
        <div><strong style={{ color: '#00ff80' }}>✅ Wins:</strong> {stats.wins}</div>
        <div><strong style={{ color: 'red' }}>❌ Losses:</strong> {stats.losses}</div>
        <div><strong style={{ color: '#99ffcc' }}>🔁 Net Elo:</strong> {stats.netElo >= 0 ? '+' : ''}{stats.netElo}</div>
        <div><strong style={{ color: '#33ff99' }}>⏱ Avg Time:</strong> {stats.avgTime}</div>
      </div>
    </div>
  );
}
