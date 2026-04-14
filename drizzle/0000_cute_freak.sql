CREATE TABLE "age_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"recorded_at" text NOT NULL,
	"staff_name" text NOT NULL,
	"age_group" text NOT NULL,
	"count" numeric DEFAULT '1',
	"synced_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"date" text NOT NULL,
	"day_of_week" text DEFAULT '',
	"staff_name" text NOT NULL,
	"value" text DEFAULT '',
	"synced_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sales_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"staff_name" text NOT NULL,
	"site" text DEFAULT '',
	"mnp_h" numeric DEFAULT '0',
	"mnp_s" numeric DEFAULT '0',
	"new_count" numeric DEFAULT '0',
	"change_count" numeric DEFAULT '0',
	"cellup" numeric DEFAULT '0',
	"hikari_n" numeric DEFAULT '0',
	"hikari_t" numeric DEFAULT '0',
	"hikari_c" numeric DEFAULT '0',
	"tablet" numeric DEFAULT '0',
	"life" numeric DEFAULT '0',
	"credit" numeric DEFAULT '0',
	"self_close" numeric DEFAULT '0',
	"synced_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"date" text NOT NULL,
	"day_of_week" text DEFAULT '',
	"location" text DEFAULT '',
	"start_time" text DEFAULT '',
	"order1" text DEFAULT '',
	"order2" text DEFAULT '',
	"staff" jsonb DEFAULT '[]'::jsonb,
	"final_staff" text DEFAULT '',
	"agency" text DEFAULT '',
	"sheet_region" text NOT NULL,
	"is_holiday" boolean DEFAULT false,
	"synced_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shift_staff_names" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"sheet_region" text NOT NULL,
	"names" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_name" text NOT NULL,
	"total_score" numeric DEFAULT '0',
	"rank" numeric DEFAULT '0',
	"potential" text DEFAULT '',
	"attendance" text DEFAULT '',
	"attribute" text DEFAULT '',
	"supervisor" text DEFAULT '',
	"scores" jsonb DEFAULT '{}'::jsonb,
	"knowledge" jsonb DEFAULT '{}'::jsonb,
	"knowledge_items" jsonb DEFAULT '[]'::jsonb,
	"synced_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "talknote_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"posted_at" text NOT NULL,
	"staff_name" text NOT NULL,
	"site" text DEFAULT '',
	"message" text NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "type_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"recorded_at" text NOT NULL,
	"staff_name" text NOT NULL,
	"type_group" text NOT NULL,
	"count" numeric DEFAULT '1',
	"synced_at" timestamp with time zone DEFAULT now()
);
