export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40 px-4 py-3">
      <div className="text-xs text-muted-foreground text-center">
        <p>© {new Date().getFullYear()} Finance Guy. All rights reserved.</p>
        <p>A project by <a href="https://github.com/jek030" className="underline hover:text-accent-foreground transition-colors">jek030</a></p>
      </div>
    </footer>
  );
}