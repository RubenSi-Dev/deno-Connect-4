import { drizzle } from "drizzle-orm/node-postgres";
import { users as userTable } from "./schema.ts";
import { eq } from "drizzle-orm";

export class UserDatabase {
  constructor(private db = drizzle(Deno.env.get("DATABASE_URL")!)) {}

  async insertUser(userObj: typeof userTable.$inferInsert) {
    return await this.db.insert(userTable).values(userObj);
  }

  async deleteUserById(id: number) {
    return await this.db.delete(userTable).where(
      eq(userTable.id, id),
    );
  }

  async updateUser(userObj: typeof userTable) {
    return await this.db.update(userTable).set(userObj).where(
      eq(userTable.id, userObj.id),
    );
  }

  async findUserByUsername(username: string) {
    return await this.db.select().from(userTable).where(
      eq(userTable.username, username),
    );
  }

  async findUserById(id: number) {
    return await this.db.select().from(userTable).where(
      eq(userTable.id, id),
    );
  }
}
