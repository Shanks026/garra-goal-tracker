PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_checkpoints` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	`target_date` text,
	`hit_at` text,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_checkpoints`("id", "goal_id", "title", "position", "target_date", "hit_at", "notes", "created_at", "updated_at") SELECT "id", "goal_id", "title", "position", "target_date", "hit_at", "notes", "created_at", "updated_at" FROM `checkpoints`;--> statement-breakpoint
DROP TABLE `checkpoints`;--> statement-breakpoint
ALTER TABLE `__new_checkpoints` RENAME TO `checkpoints`;--> statement-breakpoint
CREATE TABLE `__new_entries` (
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
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_entries`("id", "goal_id", "day_key", "logged_at", "value", "skipped", "skip_reason", "backfilled", "title", "link", "created_at", "updated_at") SELECT "id", "goal_id", "day_key", "logged_at", "value", "skipped", "skip_reason", "backfilled", "title", "link", "created_at", "updated_at" FROM `entries`;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;--> statement-breakpoint
CREATE UNIQUE INDEX `entries_goal_day` ON `entries` (`goal_id`,`day_key`) WHERE "entries"."skipped" = 0;--> statement-breakpoint
CREATE TABLE `__new_freezes` (
	`id` text PRIMARY KEY NOT NULL,
	`arc_id` text NOT NULL,
	`earned_for_week` text NOT NULL,
	`consumed_for_day_key` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`arc_id`) REFERENCES `arcs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_freezes`("id", "arc_id", "earned_for_week", "consumed_for_day_key", "created_at", "updated_at") SELECT "id", "arc_id", "earned_for_week", "consumed_for_day_key", "created_at", "updated_at" FROM `freezes`;--> statement-breakpoint
DROP TABLE `freezes`;--> statement-breakpoint
ALTER TABLE `__new_freezes` RENAME TO `freezes`;--> statement-breakpoint
CREATE TABLE `__new_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`arc_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
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
	`starts_at` text,
	`ends_at` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`arc_id`) REFERENCES `arcs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_goals`("id", "arc_id", "type", "title", "direction", "accent", "icon", "is_main", "target_amount", "unit", "starting_value", "cadence_mode", "times_per_week", "days_of_week", "interval_days", "session_target", "est_minutes", "pace_basis", "quick_add", "item_noun", "starts_at", "ends_at", "status", "created_at", "updated_at") SELECT "id", "arc_id", "type", "title", "direction", "accent", "icon", "is_main", "target_amount", "unit", "starting_value", "cadence_mode", "times_per_week", "days_of_week", "interval_days", "session_target", "est_minutes", "pace_basis", "quick_add", "item_noun", NULL, "ends_at", "status", "created_at", "updated_at" FROM `goals`;--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
ALTER TABLE `__new_goals` RENAME TO `goals`;--> statement-breakpoint
CREATE TABLE `__new_rescopes` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`from_target` real,
	`to_target` real,
	`reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_rescopes`("id", "goal_id", "from_target", "to_target", "reason", "created_at", "updated_at") SELECT "id", "goal_id", "from_target", "to_target", "reason", "created_at", "created_at" FROM `rescopes`;--> statement-breakpoint
DROP TABLE `rescopes`;--> statement-breakpoint
ALTER TABLE `__new_rescopes` RENAME TO `rescopes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;