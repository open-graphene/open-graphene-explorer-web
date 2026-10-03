import * as styles from "../styles.css";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  return (
    <section className={styles.textPage}>
      <h1>About</h1>
      <p>
        Open Graphene Explorer is a web application for the Open Graphene
        ecosystem.
      </p>
    </section>
  );
}
