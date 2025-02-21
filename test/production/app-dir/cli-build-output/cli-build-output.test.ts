import { nextTestSetup } from 'e2e-utils'
import path from 'path'
import stripAnsi from 'strip-ansi'

describe('cli-build-output', () => {
  describe('with mixed static and dynamic pages and app router routes', () => {
    const { next } = nextTestSetup({
      files: path.join(__dirname, 'fixtures/mixed'),
      skipStart: true,
    })

    beforeAll(() => next.build())

    it('should show info about prerendered and dynamic routes in a tree view', async () => {
      // TODO: Fix double-listing of the /ppr/[slug] fallback.
      // TODO: Use individual cache life values for prerendered dynamic routes.

      expect(getTreeView(next.cliOutput)).toMatchInlineSnapshot(`
       "Route (app)                                  Size  First Load JS    Cache Life
       ┌ ○ /_not-found                             ·····         ······
       ├ ƒ /api                                    ·····         ······
       ├ ○ /api/force-static                       ·····         ······
       ├ ○ /app-static                             ·····         ······
       ├ ○ /cache-life                             ·····         ······    1 w / 30 d
       ├ ƒ /dynamic                                ·····         ······
       ├ ◐ /ppr/[slug]                             ·····         ······    1 w / 30 d
       ├   ├ /ppr/[slug]                                                   1 w / 30 d
       ├   ├ /ppr/[slug]                                                   1 w / 30 d
       ├   ├ /ppr/days                                                     1 w / 30 d
       ├   └ /ppr/weeks                                                    1 w / 30 d
       └ ○ /revalidate                             ·····         ······  15 min / 1 y
       + First Load JS shared by all              ······
         ├ chunks/main-app-················.js    ······
         └ other shared chunks (total)           ·······

       Route (pages)                                Size  First Load JS    Cache Life
       ┌ ƒ /api/hello                                ···        ·······
       ├ ● /gsp-revalidate                         ·····        ·······   5 min / 1 y
       ├ ƒ /gssp                                   ·····        ·······
       └ ○ /static                                 ·····        ·······
       + First Load JS shared by all             ·······
         ├ chunks/framework-················.js  ·······
         ├ chunks/main-················.js       ·······
         └ other shared chunks (total)           ·······

       ○  (Static)             prerendered as static content
       ●  (SSG)                prerendered as static HTML (uses generateStaticParams)
       ◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
       ƒ  (Dynamic)            server-rendered on demand
          (Cache Life)         revalidate / expire"
      `)
    })
  })

  describe('with only a few static routes', () => {
    const { next } = nextTestSetup({
      files: path.join(__dirname, 'fixtures/minimal-static'),
      skipStart: true,
    })

    beforeAll(() => next.build())

    it('should show info about prerendered routes in a compact tree view', async () => {
      expect(getTreeView(next.cliOutput)).toMatchInlineSnapshot(`
       "Route (app)                                  Size  First Load JS
       ┌ ○ /                                       ·····         ······
       └ ○ /_not-found                             ·····         ······
       + First Load JS shared by all              ······
         ├ chunks/main-app-················.js    ······
         └ other shared chunks (total)           ·······

       Route (pages)                                Size  First Load JS
       ─ ○ /static                                 ·····        ·······
       + First Load JS shared by all             ·······
         ├ chunks/framework-················.js  ·······
         ├ chunks/main-················.js       ·······
         └ other shared chunks (total)           ·······

       ○  (Static)  prerendered as static content"
      `)
    })
  })
})

function getTreeView(cliOutput: string): string {
  let foundBuildTracesLine = false
  const lines: string[] = []

  for (const line of cliOutput.split('\n')) {
    if (foundBuildTracesLine) {
      lines.push(normalizeCliOutputLine(line))
    }

    foundBuildTracesLine ||= line.includes('Collecting build traces')
  }

  while (lines.at(0) === '') lines.shift()
  while (lines.at(-1) === '') lines.pop()

  return lines.join('\n')
}

function normalizeCliOutputLine(line: string): string {
  line = stripAnsi(line)

  // Replace file sizes with a placeholder.
  line = line.replace(
    /\b\d+(?:\.\d+)?\s*(B|kB|MB|GB|TB|PB|EB|ZB|YB)\b/g,
    (match) => '·'.repeat(match.length)
  )

  // Replace file hashes with a placeholder.
  line = line.replace(
    /-([a-f0-9]{8,})(\.js)/g,
    (match, p1, p2) => '-' + '·'.repeat(p1.length) + p2
  )

  // Blank out build times.
  line = line.replace(/\(\d+ ms\)/g, (match) => ' '.repeat(match.length))

  return line
}
