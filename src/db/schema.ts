import {
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial().primaryKey().notNull(),
  username: text().unique(),
  password_hash: text().notNull(),
});
