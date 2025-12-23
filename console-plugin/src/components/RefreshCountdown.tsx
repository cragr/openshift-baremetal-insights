import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button, Split, SplitItem } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';

interface RefreshCountdownProps {
  nextRefresh: string;
  onRefresh: () => void;
}

export const RefreshCountdown: React.FC<RefreshCountdownProps> = ({ nextRefresh, onRefresh }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(nextRefresh).getTime();
      const diff = Math.max(0, target - now);

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextRefresh]);

  return (
    <Split hasGutter>
      <SplitItem>
        <span style={{ color: 'var(--pf-v5-global--Color--200)' }}>
          Refreshing in {timeLeft}
        </span>
      </SplitItem>
      <SplitItem>
        <Button variant="plain" aria-label="Refresh now" onClick={onRefresh}>
          <SyncAltIcon />
        </Button>
      </SplitItem>
    </Split>
  );
};
