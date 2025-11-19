/**
 * useStashData - Hook for fetching Stash data (performers, tags, studios)
 */

import { useState, useEffect } from 'react';
import type { IStashPerformer, IStashTag, IStashStudio } from '@/types';
import { getStashService } from '@/services/stash';

interface IStashDataState {
  performers: IStashPerformer[];
  tags: IStashTag[];
  studios: IStashStudio[];
  loading: boolean;
  error: string | null;
}

export function useStashData() {
  const [state, setState] = useState<IStashDataState>({
    performers: [],
    tags: [],
    studios: [],
    loading: false,
    error: null,
  });

  const searchPerformers = async (query: string) => {
    if (!query) return [];
    try {
      const service = getStashService();
      return await service.findPerformersByName(query);
    } catch (error) {
      console.error('Error searching performers:', error);
      return [];
    }
  };

  const searchTags = async (query: string) => {
    if (!query) return [];
    try {
      const service = getStashService();
      return await service.findTagsByName(query);
    } catch (error) {
      console.error('Error searching tags:', error);
      return [];
    }
  };

  const searchStudio = async (query: string) => {
    if (!query) return null;
    try {
      const service = getStashService();
      return await service.findStudioByName(query);
    } catch (error) {
      console.error('Error searching studio:', error);
      return null;
    }
  };

  return {
    ...state,
    searchPerformers,
    searchTags,
    searchStudio,
  };
}
