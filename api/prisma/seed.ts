import { PrismaClient, Role, LeadScope } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // stages padrão
  const stages = [
    { name: "Novo", order: 1, isClosed: false },
    { name: "Contato", order: 2, isClosed: false },
    { name: "Proposta", order: 3, isClosed: false },
    { name: "Negociação", order: 4, isClosed: false },
    { name: "Fechados", order: 5, isClosed: true }
  ];

  for (const s of stages) {
    const exists = await prisma.stage.findFirst({ where: { name: s.name } });
    if (!exists) await prisma.stage.create({ data: s });
  }

  // admin padrão
  const adminEmail = "admin@politicall.local";
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const hash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        password: hash,
        role: Role.ADMIN,
        leadScope: LeadScope.ALL
      }
    });
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
