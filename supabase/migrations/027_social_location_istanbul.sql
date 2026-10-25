-- Instagram location tag for feed posts, carousels and reels: Facebook Places ID of Istanbul (Wikidata Q406, property P1997).
-- Verified with the Graph API (a media container with this location_id is accepted; the older IG explore id 212903416 is rejected).
-- Applied directly through the REST API on 2026-10-25; kept here for the record / fresh databases.
update social_settings set location_id = '106012156106461' where id = 1;
