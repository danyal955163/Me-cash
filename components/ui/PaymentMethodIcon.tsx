'use client';

import { Building2 } from 'lucide-react';

type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank';

export default function PaymentMethodIcon({ method, className = 'h-5 w-5' }: { method: PaymentMethod; className?: string }) {
  if (method === 'jazzcash') return <span aria-label="JazzCash" title="JazzCash" className="grid h-11 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-red-100 bg-white p-1.5 shadow-sm"><img src="/logos/jazzcash.png" alt="JazzCash" className="max-h-full w-full object-contain" /></span>;
  if (method === 'easypaisa') return <span aria-label="Easypaisa" title="Easypaisa" className="grid h-11 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-100 bg-white p-1.5 shadow-sm"><img src="/logos/easypaisa.png" alt="Easypaisa" className="max-h-full w-full object-contain" /></span>;
  return <span aria-label="Bank transfer" title="Bank transfer" className="grid h-11 w-16 shrink-0 place-items-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 shadow-sm"><Building2 className={className} /></span>;
}

export function PaymentMethodMark({ method }: { method: PaymentMethod }) {
  if (method === 'jazzcash') return <img src="/logos/jazzcash.png" alt="JazzCash" className="h-7 w-20 object-contain" />;
  if (method === 'easypaisa') return <img src="/logos/easypaisa.png" alt="Easypaisa" className="h-7 w-20 object-contain" />;
  return <span className="grid h-8 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700"><Building2 className="h-5 w-5" /></span>;
}
