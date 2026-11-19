/*
  Warnings:

  - The primary key for the `customers` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "ai_summaries" DROP CONSTRAINT "ai_summaries_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_packages" DROP CONSTRAINT "customer_packages_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "followup_logs" DROP CONSTRAINT "followup_logs_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_predictions" DROP CONSTRAINT "risk_predictions_customer_id_fkey";

-- AlterTable
ALTER TABLE "ai_summaries" ALTER COLUMN "customer_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "attendance" ALTER COLUMN "customer_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "customer_packages" ALTER COLUMN "customer_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "customers" DROP CONSTRAINT "customers_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "customers_id_seq";

-- AlterTable
ALTER TABLE "followup_logs" ALTER COLUMN "customer_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "reminders" ALTER COLUMN "customer_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "risk_predictions" ALTER COLUMN "customer_id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_predictions" ADD CONSTRAINT "risk_predictions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_logs" ADD CONSTRAINT "followup_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
