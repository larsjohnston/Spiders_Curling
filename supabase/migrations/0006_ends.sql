-- Optional end-by-end score entered on the score page: [{"us": 2, "them": 0}, ...] in end order.
-- our_score / their_score stay the totals so everything that reads the result keeps working.

alter table curling_games add column ends jsonb;
