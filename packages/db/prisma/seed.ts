import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { HttpMethod, PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data in dependency order
  await prisma.requestLog.deleteMany();
  await prisma.endpoint.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Database cleared.");

  // Create users
  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice Smith",
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob Jones",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@startup.com",
      name: "Admin User",
    },
  });

  console.log("👤 Users created.");

  // Create workspace
  const ecommerceWorkspace = await prisma.workspace.create({
    data: {
      name: "E-commerce Platform",
      ownerId: admin.id,
    },
  });

  const inventoryWorkspace = await prisma.workspace.create({
    data: {
      name: "Inventory Management",
      ownerId: admin.id,
    },
  });

  console.log("🏢 Workspaces created.");

  // Create scenarios
  const authScenario = await prisma.scenario.create({
    data: {
      name: "Authentication Flow",
      workspaceId: ecommerceWorkspace.id,
    },
  });

  const productScenario = await prisma.scenario.create({
    data: {
      name: "Product Catalog",
      workspaceId: ecommerceWorkspace.id,
    },
  });

  const stockScenario = await prisma.scenario.create({
    data: {
      name: "Stock Update",
      workspaceId: inventoryWorkspace.id,
    },
  });

  console.log("📂 Scenarios created.");

  // Create endpoints
  await prisma.endpoint.createMany({
    data: [
      {
        errorConfig: {
          timeout: 3000,
        },
        method: HttpMethod.POST,
        path: "/auth/login",
        responseBody: {
          message: "Login successful",
        },
        responseHeaders: {
          "Content-Type": "application/json",
        },
        responseStatus: 200,
        scenarioId: authScenario.id,
        workspaceId: ecommerceWorkspace.id,
      },
      {
        method: HttpMethod.GET,
        path: "/auth/profile",
        responseHeaders: {
          "Content-Type": "application/json",
        },
        responseStatus: 200,
        scenarioId: authScenario.id,
        workspaceId: ecommerceWorkspace.id,
      },
      {
        method: HttpMethod.GET,
        path: "/products",
        responseHeaders: {
          "Content-Type": "application/json",
        },
        responseStatus: 200,
        scenarioId: productScenario.id,
        workspaceId: ecommerceWorkspace.id,
      },
      {
        method: HttpMethod.GET,
        path: "/products/search",
        responseHeaders: {
          "Content-Type": "application/json",
        },
        responseStatus: 200,
        scenarioId: productScenario.id,
        workspaceId: ecommerceWorkspace.id,
      },
      {
        method: HttpMethod.PUT,
        path: "/inventory/update",
        responseHeaders: {
          "Content-Type": "application/json",
        },
        responseStatus: 200,
        scenarioId: stockScenario.id,
        workspaceId: inventoryWorkspace.id,
      },
    ],
  });

  console.log("🔗 Endpoints created.");

  // Create request logs
  await prisma.requestLog.createMany({
    data: [
      {
        durationMs: 150,
        method: HttpMethod.POST,
        path: "/auth/login",
        requestId: "req_001",
        responseSizeBytes: 512,
        scenarioId: authScenario.id,
        statusCode: 200,
        workspaceId: ecommerceWorkspace.id,
      },
      {
        durationMs: 80,
        method: HttpMethod.GET,
        path: "/auth/profile",
        requestId: "req_002",
        responseSizeBytes: 1024,
        scenarioId: authScenario.id,
        statusCode: 200,
        workspaceId: ecommerceWorkspace.id,
      },
      {
        durationMs: 120,
        method: HttpMethod.GET,
        path: "/products",
        requestId: "req_003",
        responseSizeBytes: 2048,
        scenarioId: productScenario.id,
        statusCode: 200,
        workspaceId: ecommerceWorkspace.id,
      },
      {
        durationMs: 200,
        method: HttpMethod.PUT,
        path: "/inventory/update",
        requestId: "req_004",
        responseSizeBytes: 256,
        scenarioId: stockScenario.id,
        statusCode: 200,
        workspaceId: inventoryWorkspace.id,
      },
    ],
  });

  console.log("📊 Request logs created.");

  console.log("✅ Seeding completed successfully.");

  console.log({
    users: [alice.email, bob.email, admin.email],
    workspaces: [ecommerceWorkspace.name, inventoryWorkspace.name],
  });
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
