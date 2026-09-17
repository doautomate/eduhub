/** Standard footer message shown on every page (FR-005). */
export function Footer() {
  return (
    <footer
      className="border-t border-border text-center text-sm text-muted-foreground"
      style={{
        height: "var(--footer-height)",
        padding: "var(--footer-padding-block) var(--space-lg)",
        flexShrink: 0,
      }}
    >
      <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} EduVid. All rights reserved.</p>
    </footer>
  );
}

export default Footer;
