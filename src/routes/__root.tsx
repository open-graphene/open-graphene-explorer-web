import { defaultWitnessSearch } from "../features/witnesses/model";
import { defaultCommitteeSearch } from "../features/committee/model";
import { defaultAccountSearch } from "../features/accounts/search";
import { defaultAssetSearch } from "../features/assets/search";
import {
  createRootRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { referenceUrl } from "../lib/config";
import * as styles from "../styles.css";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const referencePath =
    pathname.startsWith("/explorer/") ||
    pathname.startsWith("/account/") ||
    pathname.startsWith("/block/") ||
    pathname.startsWith("/asset/")
      ? pathname
      : "/explorer/blocks";
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <Link to="/explorer/blocks" className={styles.brand}>
          <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
            <path
              d="M14 2 26 9v10l-12 7L2 19V9Z M2 9l12 7 12-7 M14 16v10 M14 2v14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          Open Graphene
        </Link>
        <Link to="/explorer/blocks" className={styles.exploreLink}>
          Explore
        </Link>
        <nav className={styles.navigation} aria-label="Application">
          <Link to="/about">About</Link>
          <a
            href={`${referenceUrl}${referencePath}`}
            target="_blank"
            rel="noreferrer"
          >
            Original portal ↗
          </a>
        </nav>
      </header>
      <nav className={styles.tabs} aria-label="Explorer sections">
        <Link to="/explorer/blocks" className={styles.explorerTab}>
          Blockchain
        </Link>
        <Link
          to="/explorer/assets"
          search={defaultAssetSearch}
          className={styles.explorerTab}
        >
          Assets
        </Link>
        <Link
          to="/explorer/accounts"
          search={defaultAccountSearch}
          className={styles.explorerTab}
        >
          Accounts
        </Link>
        <Link
          to="/explorer/witnesses"
          search={defaultWitnessSearch}
          className={styles.explorerTab}
        >
          Witnesses
        </Link>
        <Link
          to="/explorer/committee"
          search={defaultCommitteeSearch}
          className={styles.explorerTab}
        >
          Committee
        </Link>
        {["Pools", "Markets", "Fees"].map((label) => (
          <span
            key={label}
            className={styles.futureTab}
            aria-disabled="true"
            title="Available in a later stage"
          >
            {label}
          </span>
        ))}
      </nav>
      <main id="main-content" className={styles.content}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        Open Graphene Explorer <span>Swaplock · Read-only</span>
      </footer>
    </div>
  );
}

function NotFoundPage() {
  return (
    <section className={styles.textPage}>
      <h1>Page not found</h1>
      <p>This address does not match an existing page.</p>
      <Link to="/explorer/blocks">Return to the blockchain</Link>
    </section>
  );
}
