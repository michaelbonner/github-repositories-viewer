import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const dashboards = pgTable("dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  githubUsername: varchar("github_username", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const dashboardRepositories = pgTable(
  "dashboard_repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dashboardId: uuid("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    repoFullName: varchar("repo_full_name", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("dashboard_repo_unique_idx").on(
      table.dashboardId,
      table.repoFullName,
    ),
    index("dashboard_repositories_dashboard_id_idx").on(table.dashboardId),
  ],
);

export const dashboardsRelations = relations(dashboards, ({ many }) => ({
  repositories: many(dashboardRepositories),
}));

export const dashboardRepositoriesRelations = relations(
  dashboardRepositories,
  ({ one }) => ({
    dashboard: one(dashboards, {
      fields: [dashboardRepositories.dashboardId],
      references: [dashboards.id],
    }),
  }),
);
