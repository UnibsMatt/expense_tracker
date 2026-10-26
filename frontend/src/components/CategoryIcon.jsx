import {
  Baby, Car, CircleEllipsis, Coffee, Dumbbell, Fuel, Gamepad2, Gift, GraduationCap,
  HeartPulse, House, Music, PawPrint, Plane, Receipt, Shirt, ShoppingBag, ShoppingCart,
  Smartphone, Tag, Utensils, Wrench,
} from 'lucide-react'

export const ICONS = {
  'shopping-cart': ShoppingCart, utensils: Utensils, car: Car, home: House, receipt: Receipt,
  'heart-pulse': HeartPulse, gamepad: Gamepad2, 'shopping-bag': ShoppingBag,
  'circle-ellipsis': CircleEllipsis, tag: Tag, coffee: Coffee, fuel: Fuel, plane: Plane,
  gift: Gift, 'paw-print': PawPrint, shirt: Shirt, smartphone: Smartphone,
  'graduation-cap': GraduationCap, baby: Baby, dumbbell: Dumbbell, music: Music, wrench: Wrench,
}

// Full class names so Tailwind can detect them at build time.
export const COLORS = {
  slate: { dot: 'bg-slate-500', soft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' },
  red: { dot: 'bg-red-500', soft: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  orange: { dot: 'bg-orange-500', soft: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  teal: { dot: 'bg-teal-500', soft: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' },
  sky: { dot: 'bg-sky-500', soft: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  indigo: { dot: 'bg-indigo-500', soft: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
  violet: { dot: 'bg-violet-500', soft: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
  pink: { dot: 'bg-pink-500', soft: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
}

export const colorOf = (c) => COLORS[c] || COLORS.slate

export default function CategoryIcon({ category, size = 'md' }) {
  const Icon = ICONS[category?.icon] || Tag
  const box = size === 'sm' ? 'size-8 rounded-lg' : 'size-11 rounded-xl'
  const icon = size === 'sm' ? 'size-4' : 'size-5'
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${colorOf(category?.color).soft}`} aria-hidden="true">
      <Icon className={icon} />
    </span>
  )
}
