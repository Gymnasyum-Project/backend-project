-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100),
    "email" VARCHAR(150),
    "password_hash" VARCHAR(225),
    "role" VARCHAR(20) DEFAULT 'admin',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "gender" VARCHAR(10),
    "birth_date" DATE,
    "segment" VARCHAR(30),
    "service_type" VARCHAR(20),
    "join_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100),
    "service_type" VARCHAR(20),
    "total_sessions" INTEGER,
    "duration_days" INTEGER,
    "price" DECIMAL(12,2),

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_packages" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "package_id" INTEGER NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "total_sessions" INTEGER,
    "remaining_sessions" INTEGER,
    "status" VARCHAR(20),

    CONSTRAINT "customer_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "customer_package_id" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "status" VARCHAR(20),
    "checkin_at" TIMESTAMP(3),
    "coach_name" VARCHAR(100),

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reschedules" (
    "id" SERIAL NOT NULL,
    "attendance_id" INTEGER NOT NULL,
    "old_schedule" TIMESTAMP(3),
    "new_schedule" TIMESTAMP(3),
    "reason" TEXT,
    "requested_at" TIMESTAMP(3),

    CONSTRAINT "reschedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "channel" VARCHAR(20) DEFAULT 'whatsapp',
    "sent_at" TIMESTAMP(3),
    "response_status" VARCHAR(20),
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" SERIAL NOT NULL,
    "version" VARCHAR(30),
    "algorithm" VARCHAR(50),
    "metrics" JSONB,
    "trained_at" TIMESTAMP(3),
    "is_active" BOOLEAN DEFAULT false,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_predictions" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "model_version_id" INTEGER NOT NULL,
    "label" VARCHAR(20),
    "probabilities" JSONB,
    "features" JSONB,
    "top_factors" JSONB,
    "priority_score" DECIMAL(5,2),
    "predicted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_summaries" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "prediction_id" INTEGER NOT NULL,
    "summary" TEXT,
    "followup_draft" TEXT,
    "edited_draft" TEXT,
    "llm_model" VARCHAR(50),
    "prompt_version" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_logs" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "summary_id" INTEGER NOT NULL,
    "action" VARCHAR(30),
    "outcome" VARCHAR(30),
    "note" TEXT,
    "acted_by" INTEGER NOT NULL,
    "acted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_customer_package_id_fkey" FOREIGN KEY ("customer_package_id") REFERENCES "customer_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reschedules" ADD CONSTRAINT "reschedules_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_predictions" ADD CONSTRAINT "risk_predictions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_predictions" ADD CONSTRAINT "risk_predictions_model_version_id_fkey" FOREIGN KEY ("model_version_id") REFERENCES "model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "risk_predictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_logs" ADD CONSTRAINT "followup_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_logs" ADD CONSTRAINT "followup_logs_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "ai_summaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_logs" ADD CONSTRAINT "followup_logs_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
