/**
 * Prevents double/triple taps from stacking the same (or multiple) navigations.
 * Patches the shared expo-router imperative `router` object used by `useRouter()`.
 */

import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';

const COOLDOWN_MS = 900;

let locked = false;
let unlockTimer: ReturnType<typeof setTimeout> | null = null;
let installed = false;

function acquireLock(): boolean {
  if (locked) {
    return false;
  }

  locked = true;
  if (unlockTimer) {
    clearTimeout(unlockTimer);
  }
  unlockTimer = setTimeout(() => {
    locked = false;
    unlockTimer = null;
  }, COOLDOWN_MS);

  return true;
}

export function releaseNavigationLock(): void {
  locked = false;
  if (unlockTimer) {
    clearTimeout(unlockTimer);
    unlockTimer = null;
  }
}

export function installNavigationGuard(): void {
  if (installed) {
    return;
  }
  installed = true;

  const originalPush = router.push.bind(router);
  const originalNavigate = router.navigate.bind(router);

  router.push = ((href, options) => {
    if (!acquireLock()) {
      return;
    }
    return originalPush(href, options);
  }) as typeof router.push;

  router.navigate = ((href, options) => {
    if (!acquireLock()) {
      return;
    }
    return originalNavigate(href, options);
  }) as typeof router.navigate;
}

/** Releases the tap-lock once the route actually changes. */
export function NavigationGuardHost() {
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => {
      releaseNavigationLock();
    }, 120);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
