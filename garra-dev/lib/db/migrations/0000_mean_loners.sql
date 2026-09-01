CREATE TABLE `arcs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`timezone` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `checkpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	`target_date` text,
	`hit_at` text,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`day_key` text NOT NULL,
	`logged_at` text NOT NULL,
	`value` real,
	`skipped` integer DEFAULT false NOT NULL,
	`skip_reason` text,
	`backfilled` integer DEFAULT false NOT NULL,
	`title` text,
	`link` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_goal_day` ON `entries` (`goal_id`,`day_key`) WHERE "entries"."skipped" = 0;--> statement-breakpoint
CREATE TABLE `freezes` (
	`id` text PRIMARY KEY NOT NULL,
	`arc_id` text NOT NULL,
	`earned_for_week` text NOT NULL,
	`consumed_for_day_key` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`arc_id`) REFERENCES `arcs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`arc_id` text NOT NULL,
	`type` text NOT NULL,
	`direction` text DEFAULT 'up' NOT NULL,
	`accent` text NOT NULL,
	`icon` text NOT NULL,
	`is_main` integer DEFAULT false NOT NULL,
	`target_amount` real,
	`unit` text,
	`starting_value` real,
	`cadence_mode` text,
	`times_per_week` integer,
	`days_of_week` text,
	`interval_days` integer,
	`session_target` real,
	`est_minutes` integer,
	`pace_basis` text,
	`quick_add` text,
	`item_noun` text,
	`ends_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`arc_id`) REFERENCES `arcs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rescopes` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`from_target` real,
	`to_target` real,
	`reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
