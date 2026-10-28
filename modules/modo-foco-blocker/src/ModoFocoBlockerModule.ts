import { NativeModule, requireNativeModule } from 'expo';

import type { LaunchableApp } from './ModoFocoBlocker.types';

declare class ModoFocoBlockerModule extends NativeModule<{}> {
  hasUsagePermission(): boolean;
  openUsageSettings(): void;
  hasOverlayPermission(): boolean;
  openOverlaySettings(): void;
  getLaunchableApps(): Promise<LaunchableApp[]>;
  /** Inicia o bloqueio. `endsAt` é um timestamp em ms, como `Date.now()`. */
  startBlocking(packages: string[], endsAt: number): void;
  stopBlocking(): void;
  isBlocking(): boolean;
}

export default requireNativeModule<ModoFocoBlockerModule>('ModoFocoBlocker');
