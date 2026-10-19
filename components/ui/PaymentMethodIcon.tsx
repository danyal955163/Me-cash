'use client';

import { Building2, WalletCards } from 'lucide-react';

type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank';

export default function PaymentMethodIcon({ method, className = 'h-5 w-5' }: { method: PaymentMethod; className?: string }) {
  if (method === 'jazzcash') {
    return <span aria-label="JazzCash" title="JazzCash" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-xs font-black text-yellow-300 shadow-sm"><span className="leading-none">JC</span></span>;
  }
  if (method === 'easypaisa') {
    return <span aria-label="Easypaisa" title="Easypaisa" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-xs font-black text-white shadow-sm"><span className="leading-none">EP</span></span>;
  }
  return <span aria-label="Bank transfer" title="Bank transfer" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 shadow-sm"><Building2 className={className} /></span>;
}

export function PaymentMethodMark({ method }: { method: PaymentMethod }) {
  if (method === 'bank') return <Building2 className="h-5 w-5 text-blue-600" />;
  return <WalletCards className={`h-5 w-5 ${method === 'jazzcash' ? 'text-red-600' : 'text-emerald-600'}`} />;
}
