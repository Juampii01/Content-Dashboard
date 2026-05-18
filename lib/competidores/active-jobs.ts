export type ActiveJob = {
  jobId: string
  username: string
  requestedCount: 10 | 20 | 30
  kind: 'initial' | 'refresh'
  startedAt: string
}

const KEY = 'competidores:activeJobs'

export function readActive(): ActiveJob[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as ActiveJob[]
  } catch {
    return []
  }
}

export function writeActive(jobs: ActiveJob[]): void {
  localStorage.setItem(KEY, JSON.stringify(jobs))
}

export function addActive(j: ActiveJob): void {
  writeActive([...readActive().filter((x) => x.jobId !== j.jobId), j])
}

export function removeActive(jobId: string): void {
  writeActive(readActive().filter((x) => x.jobId !== jobId))
}
