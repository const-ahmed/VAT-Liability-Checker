create table "search_history" (
  "id" text not null primary key,
  "userId" text not null references "user" ("id") on delete cascade,
  "query" text not null,
  "vatRate" text not null,
  "citations" jsonb not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index "search_history_userId_idx" on "search_history" ("userId");