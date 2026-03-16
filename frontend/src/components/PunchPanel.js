import React from 'react';
import './PunchPanel.css';

const ACTIONS = [
  {
    id: 'punch-in',
    label: 'Punch In',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
    color: 'green',
    desc: 'Start your workday',
  },
  {
    id: 'break',
    label: 'Break',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    color: 'amber',
    desc: 'Take a short break',
  },
  {
    id: 'punch-out',
    label: 'Punch Out',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
    color: 'red',
    desc: 'End your workday',
  },
];

export default function PunchPanel({
  selectedMember,
  entryType,
  setEntryType,
  manualTime,
  setManualTime,
  manualDate,
  setManualDate,
  liveTime,
  onPunch,
  loading,
  lastAction,
}) {
  const disabled = !selectedMember || loading;

  return (
    <div className="punch-panel">
      {/* Entry Type Toggle */}
      <div className="entry-toggle-wrap">
        <span className="toggle-label">Entry Mode</span>
        <div className="entry-toggle">
          <button
            className={`toggle-btn ${entryType === 'auto' ? 'active' : ''}`}
            onClick={() => setEntryType('auto')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Auto
          </button>
          <button
            className={`toggle-btn ${entryType === 'manual' ? 'active' : ''}`}
            onClick={() => setEntryType('manual')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="17" y1="3" x2="7" y2="13" />
              <rect x="1" y="13" width="6" height="6" rx="1" />
              <path d="M14 3l7 7" />
            </svg>
            Manual
          </button>
        </div>
      </div>

      {/* Auto time display */}
      {entryType === 'auto' && (
        <div className="auto-time-display animate-fade">
          <div className="auto-time-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div className="auto-time-value">{liveTime.time}</div>
            <div className="auto-time-date">{liveTime.date}</div>
          </div>
          <div className="auto-badge">LIVE</div>
        </div>
      )}

      {/* Manual time inputs */}
      {entryType === 'manual' && (
        <div className="manual-inputs animate-in">
          <div className="input-group">
            <label className="input-label">Time</label>
            <input
              type="time"
              className="time-input"
              value={manualTime}
              onChange={(e) => setManualTime(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Date</label>
            <input
              type="date"
              className="time-input"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!selectedMember && (
        <div className="select-prompt">
          Please select a team member first
        </div>
      )}

      <div className="action-buttons">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            className={`action-btn action-btn--${action.color} ${lastAction?.action === action.id ? 'just-used' : ''}`}
            onClick={() => onPunch(action.id)}
            disabled={disabled}
            title={action.desc}
          >
            <span className="action-icon">{action.icon}</span>
            <div className="action-label-wrap">
              <span className="action-label">{action.label}</span>
              <span className="action-desc">{action.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Last action feedback */}
      {lastAction && (
        <div className={`last-action-badge animate-fade last-action--${lastAction.color}`}>
          <span>✓</span>
          <span>
            <strong>{lastAction.name}</strong> — {lastAction.label} at {lastAction.time}
          </span>
        </div>
      )}
    </div>
  );
}
