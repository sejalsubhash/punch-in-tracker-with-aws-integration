import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

import Header        from './components/Header';
import MemberSelector from './components/MemberSelector';
import PunchPanel    from './components/PunchPanel';
import RecordsTable  from './components/RecordsTable';
import StatsBar      from './components/StatsBar';
import Toast         from './components/Toast';

import { useTime }                from './hooks/useTime';
import { fetchMembers, fetchAllRecords, createPunchRecord } from './utils/api';

let toastCounter = 0;

const ACTION_META = {
  'punch-in':  { label: 'Punched In',  color: 'green' },
  'break':     { label: 'On Break',    color: 'amber' },
  'punch-out': { label: 'Punched Out', color: 'red'   },
};

export default function App() {
  const [members, setMembers]             = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  const [records, setRecords]             = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const [punchLoading, setPunchLoading]   = useState(false);
  const [lastAction, setLastAction]       = useState(null);

  const [toasts, setToasts]               = useState([]);
  const pollingRef                        = useRef(null);

  const {
    liveTime, entryType, setEntryType,
    manualTime, setManualTime,
    manualDate, setManualDate,
    getSubmitTime,
  } = useTime();

  // ─── Toast helpers ───────────────────────────────────────────────────────────
  const addToast = useCallback((type, title, message, duration = 4000) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Load members ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMembers()
      .then(setMembers)
      .catch(() => addToast('error', 'Error', 'Could not load team members'))
      .finally(() => setMembersLoading(false));
  }, [addToast]);

  // ─── Load records ────────────────────────────────────────────────────────────
  const loadRecords = useCallback(() => {
    setRecordsLoading(true);
    fetchAllRecords()
      .then(setRecords)
      .catch(() => addToast('error', 'Error', 'Could not load records'))
      .finally(() => setRecordsLoading(false));
  }, [addToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // ─── Auto-refresh records every 30s ─────────────────────────────────────────
  useEffect(() => {
    pollingRef.current = setInterval(loadRecords, 30000);
    return () => clearInterval(pollingRef.current);
  }, [loadRecords]);

  // ─── Punch action ────────────────────────────────────────────────────────────
  const handlePunch = useCallback(async (action) => {
    if (!selectedMember) {
      addToast('warning', 'No Member Selected', 'Please select a team member first.');
      return;
    }

    if (punchLoading) return;

    const timeData = getSubmitTime();
    if (!timeData) {
      addToast('warning', 'Missing Time', 'Please enter both time and date for manual entry.');
      return;
    }

    setPunchLoading(true);
    try {
      await createPunchRecord({
        name:      selectedMember,
        action,
        time:      timeData.time,
        date:      timeData.date,
        entryType: timeData.entryType,
      });

      const meta = ACTION_META[action];
      setLastAction({ action, name: selectedMember, time: timeData.time, ...meta });

      addToast(
        'success',
        `${meta.label}!`,
        `${selectedMember} ${meta.label.toLowerCase()} at ${timeData.time}`
      );

      // Refresh records table
      loadRecords();
    } catch (err) {
      console.error('Punch error:', err);
      addToast('error', 'Failed', err?.response?.data?.error || 'Could not save punch record. Check your connection.');
    } finally {
      setPunchLoading(false);
    }
  }, [selectedMember, punchLoading, getSubmitTime, addToast, loadRecords]);

  // ─── Clear last action after 8s ──────────────────────────────────────────────
  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => setLastAction(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  return (
    <div className="app">
      <Header selectedMember={selectedMember} liveTime={liveTime} />

      <main className="app-main">
        <div className="content-wrap">

          {/* Stats Row */}
          <StatsBar records={records} />

          {/* Main Grid: Left panel + Right table */}
          <div className="main-grid">

            {/* Left Column */}
            <div className="left-col">
              <MemberSelector
                members={members}
                selected={selectedMember}
                onSelect={setSelectedMember}
                loading={membersLoading}
              />

              <PunchPanel
                selectedMember={selectedMember}
                entryType={entryType}
                setEntryType={setEntryType}
                manualTime={manualTime}
                setManualTime={setManualTime}
                manualDate={manualDate}
                setManualDate={setManualDate}
                liveTime={liveTime}
                onPunch={handlePunch}
                loading={punchLoading}
                lastAction={lastAction}
              />
            </div>

            {/* Right Column */}
            <div className="right-col">
              <RecordsTable
                records={records}
                loading={recordsLoading}
                onRefresh={loadRecords}
                filterMember={null}
              />
            </div>
          </div>

        </div>
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
