declare module 'potree' {
  export interface Viewer {
    setEDLEnabled(enabled: boolean): void;
    setFOV(fov: number): void;
    setPointBudget(budget: number): void;
    setBackground(background: string): void;
    scene: {
      addPointCloud(pointCloud: any): void;
      scene: {
        add(object: any): void;
      };
    };
    fitToScreen(): void;
    dispose(): void;
  }

  export interface ViewerConstructor {
    new (container: HTMLElement): Viewer;
  }

  export const Viewer: ViewerConstructor;

  export function loadPointCloud(url: string, name: string): Promise<any>;
}