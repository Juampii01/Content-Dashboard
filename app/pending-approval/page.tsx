import { redirect } from 'next/navigation'

// /pending-approval no longer exists — user management is handled by admins.
// Any old link or bookmark redirects to home.
export default function PendingApprovalPage() {
  redirect('/')
}
