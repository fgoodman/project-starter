// Local development: the server (Worker via `wrangler dev`, :8817) and the client
// (Vite, :5293) together, so one can't be left running without the other.
// If either stops, both stop.
import { spawn } from 'node:child_process'

const servers = [
  { name: 'server', args: ['run', 'dev', '-w', 'server'] },
  { name: 'client', args: ['run', 'dev', '-w', 'client'] },
]

let stopping = false
const children = servers.map(({ name, args }) => {
  // Own process group, so stopping it also stops wrangler/vite under npm
  const child = spawn('npm', args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true })
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.trim()) process.stdout.write(`[${name}] ${line}\n`)
      }
    })
  }
  child.on('exit', (code) => {
    if (!stopping) {
      console.log(`[${name}] stopped (${code ?? 'signal'}); stopping the others`)
      stopAll(code ?? 1)
    }
  })
  return child
})

function stopAll(code = 0) {
  stopping = true
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      // already gone
    }
  }
  process.exit(code)
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
