import { redirect } from 'next/navigation'

/** Redirect legacy standalone route to the unified Investigación hub. */
export default function CompetidoresPage() {
  redirect('/investigacion')
}
