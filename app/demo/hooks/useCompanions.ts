import { useState, useCallback } from 'react';
import { Companion } from '../types/companions';
import { PRE_CONFIGURED_COMPANIONS } from '../services/companions-service';

export function useCompanions() {
  const [companions, setCompanions] = useState<Companion[]>(PRE_CONFIGURED_COMPANIONS);
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);

  const handleCompanionClick = useCallback((companionId: string) => {
    setSelectedCompanionId(companionId);
  }, []);

  const updateCompanionConfig = useCallback((companionId: string, config: Partial<Companion>) => {
    setCompanions(prev => prev.map(companion => 
      companion.id === companionId 
        ? { ...companion, ...config }
        : companion
    ));
  }, []);

  const resetConfiguration = useCallback(() => {
    setCompanions(PRE_CONFIGURED_COMPANIONS);
    setActiveCompanionId(null);
    setSelectedCompanionId(null);
  }, []);

  return {
    companions,
    activeCompanionId,
    selectedCompanionId,
    setCompanions,
    setActiveCompanionId,
    setSelectedCompanionId,
    handleCompanionClick,
    updateCompanionConfig,
    resetConfiguration
  };
} 