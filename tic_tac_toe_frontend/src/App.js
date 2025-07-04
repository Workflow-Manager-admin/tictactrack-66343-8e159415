import React, { useState, useEffect } from 'react';
import './App.css';

// Backend root URL (set this to backend API domain in deployment)
const API_BASE = process.env.REACT_APP_BACKEND_API || 'http://localhost:8000';

// Utility for API calls with error handling
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!resp.ok) throw new Error((await resp.json()).detail || resp.statusText);
  return resp.json();
}

// PUBLIC_INTERFACE
function App() {
  // Global UI theme state
  const [theme, setTheme] = useState('light');
  // Auth and basic UI states
  const [user, setUser] = useState(null);
  const [authPage, setAuthPage] = useState('login'); // 'login' | 'register'
  const [authError, setAuthError] = useState('');
  // Game state and leaderboard
  const [game, setGame] = useState(null);
  const [moveError, setMoveError] = useState('');
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  // Page navigation
  const [page, setPage] = useState('game'); // 'game' | 'leaderboard'
  
  // UI theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Check if already logged in on start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiFetch('/users/me').then(setUser).catch(() => {
        setUser(null);
        localStorage.removeItem('token');
      });
    }
  }, []);
  
  // Fetch current game state
  useEffect(() => {
    if (user && page === 'game') {
      setLoading(true);
      apiFetch('/game/current').then(g => { setGame(g); setLoading(false); })
        .catch(() => { setGame(null); setLoading(false); });
    }
  }, [user, page]);
  
  // Fetch leaderboard
  useEffect(() => {
    if (user && page === 'leaderboard') {
      setLoading(true);
      apiFetch('/leaderboard').then(lb => { setLeaderboard(lb); setLoading(false); })
        .catch(() => { setLeaderboard([]); setLoading(false); });
    }
  }, [user, page]);

  // Theme toggle
  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // PUBLIC_INTERFACE
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      setAuthError('Username and password required');
      return;
    }
    try {
      let data;
      if (authPage === 'login') {
        data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
      } else {
        data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
      }
      localStorage.setItem('token', data.access_token);
      setUser(data.user);
      setAuthError('');
    } catch (e) {
      setAuthError(e.message || 'Authentication failed');
    }
  };

  // PUBLIC_INTERFACE
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setGame(null);
    setLeaderboard([]);
  };

  // PUBLIC_INTERFACE
  const handleMove = async (row, col) => {
    setMoveError('');
    setLoading(true);
    try {
      const updated = await apiFetch('/game/move', {
        method: 'POST',
        body: JSON.stringify({ row, col }),
      });
      setGame(updated);
    } catch (e) {
      setMoveError(e.message || 'Invalid move');
    }
    setLoading(false);
  };

  // PUBLIC_INTERFACE
  const handleNewGame = async () => {
    setLoading(true);
    try {
      const newGame = await apiFetch('/game/new', { method: 'POST' });
      setGame(newGame);
      setMoveError('');
    } catch (e) {
      setMoveError(e.message || 'Could not start a new game');
    }
    setLoading(false);
  };

  // UI components
  if (!user) {
    return (
      <div className="App">
        <header className="App-header">
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <h1 style={{ marginBottom: 0 }}>Tic Tac Track</h1>
          <div style={{ margin: '24px auto', minWidth: 280, maxWidth: 340, background: 'var(--bg-secondary)', borderRadius: 8, padding: 32, boxShadow: '0 2px 8px #0001' }}>
            <h2 style={{ marginTop: 0 }}>{authPage === 'login' ? 'Login' : 'Register'}</h2>
            <form onSubmit={handleAuth}>
              <label>
                Username:
                <input name="username" type="text" autoComplete="username" style={inputStyle} />
              </label>
              <br />
              <label>
                Password:
                <input name="password" type="password" autoComplete={authPage === 'login' ? "current-password" : "new-password"} style={inputStyle} />
              </label>
              <br />
              <button type="submit" className="theme-toggle" style={{ margin: '16px 0', width: '100%' }}>
                {authPage === 'login' ? 'Login' : 'Register'}
              </button>
            </form>
            {authError && <div style={{ color: '#b71c1c', marginTop: 8 }}>{authError}</div>}
            <div style={{ marginTop: 12 }}>
              {authPage === 'login'
                ? (<span>Don't have an account? <button onClick={() => setAuthPage('register')} style={linkBtn}>Register</button></span>)
                : (<span>Already have an account? <button onClick={() => setAuthPage('login')} style={linkBtn}>Login</button></span>)}
            </div>
          </div>
        </header>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="App">
      <header className="App-header" style={{ alignItems: 'stretch' }}>
        <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 40, letterSpacing: 1, color: 'var(--text-primary)' }}>Tic Tac Track</div>
          <div>
            <strong>{user.username}</strong>
            <button onClick={handleLogout} style={{ ...linkBtn, marginLeft: 20, color: '#1976d2', fontWeight: 700 }}>Logout</button>
          </div>
        </div>
        {/* Navigation */}
        <div style={{ marginBottom: 24 }}>
          <button style={page === 'game' ? selectedTab : tabBtn} onClick={() => setPage('game')}>Game</button>
          <button style={page === 'leaderboard' ? selectedTab : tabBtn} onClick={() => setPage('leaderboard')}>Leaderboard</button>
        </div>
        {/* Main page content */}
        {page === 'game' ? (
          <>
            {game ? (
              <TicTacToeBoard
                game={game}
                user={user}
                onMove={handleMove}
                loading={loading}
              />
            ) : (
              <div>
                <p>No active game found.</p>
                <button className="theme-toggle" style={{ margin: 12 }} onClick={handleNewGame} disabled={loading}>Start New Game</button>
              </div>
            )}
            {moveError && <div style={{ color: '#b71c1c', marginTop: 18 }}>{moveError}</div>}
            {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}
            {/* Player/score sidebar */}
            {game && (
              <div style={sideInfoStyle}>
                <strong>Players</strong>
                <div><b>X:</b> {game.player_x?.username || 'Waiting...'}</div>
                <div><b>O:</b> {game.player_o?.username || 'Waiting...'}</div>
                <div>Status: <b>{formatStatus(game)}</b></div>
                <div>Turn: <b>{game.current_turn}</b></div>
                <button className="theme-toggle" style={{ marginTop: 16 }} onClick={handleNewGame} disabled={loading || !game.finished}>Start New Game</button>
              </div>
            )}
          </>
        ) : (
          <Leaderboard leaderboard={leaderboard} loading={loading} />
        )}
      </header>
    </div>
  );
}

// Helper component: Tic Tac Toe board
function TicTacToeBoard({ game, user, onMove, loading }) {
  const canMove = game.status === 'active' && !loading &&
    ((game.current_turn === 'X' && user.username === game.player_x?.username) ||
      (game.current_turn === 'O' && user.username === game.player_o?.username));
  // PUBLIC_INTERFACE
  return (
    <div style={boardContainerStyle}>
      <table style={boardStyle}>
        <tbody>
          {[0, 1, 2].map(row =>
            <tr key={row}>
              {[0, 1, 2].map(col =>
                <td
                  key={col}
                  style={cellStyle(game.board[row][col])}
                  onClick={() => canMove && !game.board[row][col] && onMove(row, col)}
                  aria-disabled={!canMove || !!game.board[row][col]}
                >
                  {game.board[row][col]}
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ marginTop: 18 }}>
        {game.status === 'finished' && (
          <span>
            <b>Game Over:</b> {game.winner
              ? `Winner: ${game.winner}`
              : 'Draw!'}
          </span>
        )}
      </div>
    </div>
  );
}

// Helper component: Leaderboard table
function Leaderboard({ leaderboard, loading }) {
  // PUBLIC_INTERFACE
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ marginTop: 0, textAlign: 'center', fontSize: 28 }}>Leaderboard</h2>
      {loading && <p>Loading...</p>}
      {leaderboard.length === 0 ? (
        <p>No scores yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 18 }}>
          <thead>
            <tr>
              <th align="left">User</th>
              <th align="right">Wins</th>
              <th align="right">Games</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map(row => (
              <tr key={row.username}>
                <td>{row.username}</td>
                <td align="right">{row.wins}</td>
                <td align="right">{row.games_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// UI styling

const boardContainerStyle = {
  background: 'var(--bg-secondary)',
  borderRadius: 12,
  boxShadow: '0 2px 8px #0002',
  width: 310,
  margin: '0 auto',
  padding: 18
};

const boardStyle = {
  borderSpacing: 0,
  margin: '0 auto',
  width: 270,
  height: 270
};

const cellStyle = (cellVal) => ({
  border: '2px solid var(--border-color)',
  width: 80,
  height: 80,
  textAlign: 'center',
  fontSize: 45,
  fontWeight: 700,
  background: cellVal === null ? '#fff6' : (cellVal === 'X' ? '#1976d230' : '#ff980030'),
  color: cellVal === 'X' ? '#1976d2' : cellVal === 'O' ? '#ff9800' : '#1976d2',
  cursor: cellVal === null ? 'pointer' : 'default',
  transition: 'background 0.2s',
  userSelect: 'none'
});

const inputStyle = {
  fontSize: 17,
  padding: '7px 13px',
  margin: '6px 0 14px 0',
  borderRadius: 6,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  width: '100%',
  boxSizing: 'border-box'
};

const linkBtn = {
  background: 'none',
  border: 'none',
  color: '#1976d2',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: 16,
  padding: 0,
  fontWeight: 600
};

const tabBtn = {
  ...linkBtn,
  borderRadius: 8,
  padding: '8px 24px',
  background: '#fff6',
  margin: '0 6px',
  fontWeight: 700,
  fontSize: 17,
  boxShadow: '0 1px 2px #0001',
  border: '1px solid var(--border-color)'
};

const selectedTab = {
  ...tabBtn,
  background: '#1976d2',
  color: '#fff',
  border: '1.5px solid #1976d2'
};

const sideInfoStyle = {
  margin: '38px auto 0 auto',
  background: 'var(--bg-secondary)',
  borderRadius: 8,
  padding: 18,
  maxWidth: 340,
  textAlign: 'left',
  fontSize: 19,
  boxShadow: '0 2px 6px #0001'
};

function formatStatus(game) {
  if (game.status === 'waiting') return 'Waiting for opponent';
  if (game.status === 'finished')
    return game.winner ? `Finished. Winner: ${game.winner}` : "Draw!";
  return 'Active';
}

export default App; 
