-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'srs_due';

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "quiet_hour_end" VARCHAR(5) DEFAULT '07:00',
ADD COLUMN     "quiet_hour_start" VARCHAR(5) DEFAULT '22:00',
ADD COLUMN     "srs_reminder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "metadata" JSONB;

