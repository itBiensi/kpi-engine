import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // Jika DATABASE_URL kosong, gunakan string kosong agar tidak undefined
    url: process.env.DATABASE_URL as string,
  },
});
