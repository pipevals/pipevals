CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"pipeline_id" text NOT NULL,
	"run_id" text NOT NULL,
	"node_id" text NOT NULL,
	"hook_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rubric" jsonb NOT NULL,
	"display_data" jsonb NOT NULL,
	"response" jsonb,
	"reviewer_index" integer DEFAULT 0 NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "pipeline" ALTER COLUMN "trigger_schema" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_pipeline_id_pipeline_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_run_id_pipeline_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_hook_token_uidx" ON "task" USING btree ("hook_token");--> statement-breakpoint
CREATE INDEX "task_run_idx" ON "task" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "task_pipeline_idx" ON "task" USING btree ("pipeline_id");