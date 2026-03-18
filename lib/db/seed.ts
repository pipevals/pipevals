import "dotenv/config";
import { auth } from "../auth";
import { db } from ".";
import { isAutoInviteEnabled, DEFAULT_ORG_SLUG } from "../auto-invite";

const SEED_USER_EMAIL = "demo@pipe.evals";
const SEED_USER_PASSWORD = "pipevals-dev";

async function seedDemoOrg() {
  if (!isAutoInviteEnabled()) {
    return;
  }

  console.log("Creating demo organization...");
  const existing = await db.query.organization.findFirst({
    where: (org, { eq }) => eq(org.slug, DEFAULT_ORG_SLUG),
  });
  if (existing) {
    console.log(`Demo organization already exists (id: ${existing.id}). Skipping...`);
    return;
  }

  let userId: string;
  try {
    const { user } = await auth.api.createUser({
      body: {
        email: SEED_USER_EMAIL,
        name: "Demo User",
        role: "admin",
        password: SEED_USER_PASSWORD,
      },
    });
    userId = user.id;
    console.log(`Demo user created (email: ${SEED_USER_EMAIL}, password: ${SEED_USER_PASSWORD})`);
  } catch (error) {
    console.error("Failed to create demo user:", error);
    const existingUser = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, SEED_USER_EMAIL),
    });
    if (!existingUser) throw new Error("Failed to create or find demo user");
    userId = existingUser.id;
  }

  const org = await auth.api.createOrganization({
    body: { name: "Demo", slug: DEFAULT_ORG_SLUG, userId },
  });
  console.log(`Demo organization created (id: ${org.id})`);
}

async function seed() {
  await seedDemoOrg();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
