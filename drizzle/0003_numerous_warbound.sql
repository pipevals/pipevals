CREATE TABLE "pipeline_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"trigger_schema" jsonb DEFAULT '{}'::jsonb,
	"graph_snapshot" jsonb NOT NULL,
	"organization_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_template" ADD CONSTRAINT "pipeline_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_template" ADD CONSTRAINT "pipeline_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tmpl_slug_org_uidx" ON "pipeline_template" USING btree ("slug","organization_id") WHERE "pipeline_template"."organization_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tmpl_slug_builtin_uidx" ON "pipeline_template" USING btree ("slug") WHERE "pipeline_template"."organization_id" IS NULL;--> statement-breakpoint
CREATE INDEX "tmpl_org_idx" ON "pipeline_template" USING btree ("organization_id");