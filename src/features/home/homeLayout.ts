export type HomeSection =
  | 'greeting'
  | 'banners'
  | 'categories'
  | 'support'
  | 'stats'
  | 'quickActions'
  | 'requests'
  | 'visit';

const ROLE_LAYOUTS: Record<string, HomeSection[]> = {
  tenant: ['greeting', 'banners', 'categories', 'stats'],
};

const DEFAULT_LAYOUT: HomeSection[] = [
  'greeting',
  'support',
  'stats',
  'quickActions',
  'requests',
  'visit',
];

export function homeSectionsFor(role?: string | null): HomeSection[] {
  return (role && ROLE_LAYOUTS[role]) || DEFAULT_LAYOUT;
}
