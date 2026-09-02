CREATE TABLE `sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`watermark` text,
	`last_synced_at` text,
	`last_error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
