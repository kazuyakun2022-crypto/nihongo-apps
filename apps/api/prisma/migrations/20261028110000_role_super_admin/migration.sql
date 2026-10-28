-- Role super_admin sudah ada di schema.prisma tapi belum pernah dibuat migrasinya.
-- IF NOT EXISTS: aman untuk database yang sudah menambahkannya lewat `prisma db push`.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'super_admin';
