import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { marked } from 'marked'
import { ThemeToggle } from '../theme/ThemeToggle.jsx'

// Renders one policy document (Markdown source imported with ?raw) as a styled,
// publicly viewable page. Content is self-authored and static, so parsing it to
// HTML and injecting it is safe — there is no user input in this path. GFM tables
// are on by default in marked, which the docs rely on. Prose styling lives in the
// `.legal-doc` block in index.css (uses design-system vars → flips with dark mode).
export function LegalDoc({ title, source }) {
  useEffect(() => {
    const prev = document.title
    if (title) document.title = `${title} — Schedule AI`
    return () => { document.title = prev }
  }, [title])

  const html = marked.parse(source)

  return (
    <div className="fade-up relative min-h-screen px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
          ← Back
        </Link>
        <article
          className="legal-doc glass-card mt-4 p-8 md:p-10"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
