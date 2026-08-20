import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <span className="text-sm font-medium">digital-library</span>
      <ThemeToggle />
    </header>
  )
}
