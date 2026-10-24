-- 13 daily items: 5 feed posts + 8 stories (Istanbul time, each >= 30 min from any feed post).
alter table social_settings alter column daily_slots set default '[
  {"type":"feed","time":"09:30"},
  {"type":"story","time":"10:15"},
  {"type":"story","time":"11:30"},
  {"type":"feed","time":"12:30"},
  {"type":"story","time":"13:45"},
  {"type":"feed","time":"15:30"},
  {"type":"story","time":"16:30"},
  {"type":"story","time":"17:30"},
  {"type":"feed","time":"18:30"},
  {"type":"story","time":"19:45"},
  {"type":"feed","time":"21:30"},
  {"type":"story","time":"22:30"},
  {"type":"story","time":"23:30"}
]'::jsonb;

update social_settings set daily_slots = '[
  {"type":"feed","time":"09:30"},
  {"type":"story","time":"10:15"},
  {"type":"story","time":"11:30"},
  {"type":"feed","time":"12:30"},
  {"type":"story","time":"13:45"},
  {"type":"feed","time":"15:30"},
  {"type":"story","time":"16:30"},
  {"type":"story","time":"17:30"},
  {"type":"feed","time":"18:30"},
  {"type":"story","time":"19:45"},
  {"type":"feed","time":"21:30"},
  {"type":"story","time":"22:30"},
  {"type":"story","time":"23:30"}
]'::jsonb where id = 1;

notify pgrst, 'reload schema';
