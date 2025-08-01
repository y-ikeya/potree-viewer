import { useRef, useCallback, useEffect, useState } from 'react';

interface PotreeInstance {
  viewer: any;
  loadPointCloud: (url: string, name?: string) => Promise<any>;
  setPointBudget: (budget: number) => void;
  setEDLEnabled: (enabled: boolean) => void;
  setBackground: (type: 'gradient' | 'skybox' | 'solid') => void;
  fitToScreen: () => void;
  dispose: () => void;
}

interface UsePotreeOptions {
  pointBudget?: number;
  edlEnabled?: boolean;
  background?: 'gradient' | 'skybox' | 'solid';
  fov?: number;
}

export const usePotree = (
  container: HTMLElement | null,
  options: UsePotreeOptions = {}
) => {
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [potreeInstance, setPotreeInstance] = useState<PotreeInstance | null>(null);

  const {
    pointBudget = 1_000_000,
    edlEnabled = true,
    background = 'gradient',
    fov = 60
  } = options;

  const initializePotree = useCallback(async () => {
    if (!container) return;

    try {
      setIsLoading(true);
      setError(null);

      const Potree = await import('potree');
      
      const viewer = new Potree.Viewer(container);
      viewer.setEDLEnabled(edlEnabled);
      viewer.setFOV(fov);
      viewer.setPointBudget(pointBudget);
      viewer.setBackground(background);

      viewerRef.current = viewer;

      const instance: PotreeInstance = {
        viewer,
        loadPointCloud: async (url: string, name: string = 'pointcloud') => {
          const pointcloud = await Potree.loadPointCloud(url, name);
          viewer.scene.addPointCloud(pointcloud);
          return pointcloud;
        },
        setPointBudget: (budget: number) => viewer.setPointBudget(budget),
        setEDLEnabled: (enabled: boolean) => viewer.setEDLEnabled(enabled),
        setBackground: (type: 'gradient' | 'skybox' | 'solid') => viewer.setBackground(type),
        fitToScreen: () => viewer.fitToScreen(),
        dispose: () => {
          if (viewerRef.current) {
            viewerRef.current.dispose();
            viewerRef.current = null;
          }
        }
      };

      setPotreeInstance(instance);
      setIsLoading(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Potree';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Potree initialization error:', err);
    }
  }, [container, pointBudget, edlEnabled, background, fov]);

  useEffect(() => {
    initializePotree();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, [initializePotree]);

  return {
    potree: potreeInstance,
    isLoading,
    error,
    reload: initializePotree
  };
};