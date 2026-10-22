begin;

SET local check_function_bodies = off;

CREATE TABLE "public"."club_event_rsvps" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "public_id"  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"   bigint                   NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "club_event_rsvps_pkey" PRIMARY KEY (id),
  CONSTRAINT "club_event_rsvps_public_id_key" UNIQUE (public_id),
  "profile_id" bigint                   NOT NULL DEFAULT private.current_profile_id(),
  CONSTRAINT "club_event_rsvps_profile_id_event_id_key" UNIQUE (profile_id, event_id)
);

ALTER TABLE "public"."club_event_rsvps"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."club_event_rsvps" FROM "anon", "authenticated";

CREATE TABLE "public"."club_events" (
  "id"          bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "public_id"   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "club_id"     bigint                   NOT NULL,
  "slug"        text,
  "title"       text                     NOT NULL,
  "starts_at"   timestamp with time zone NOT NULL,
  "ends_at"     timestamp with time zone NOT NULL,
  "location"    text                     NOT NULL,
  "price"       text                     NOT NULL DEFAULT 'Free entry'::text,
  "event_type"  text                     NOT NULL,
  "poster"      text                     NOT NULL DEFAULT 'film'::text,
  "description" text                     NOT NULL DEFAULT ''::text,
  "note"        text                     NOT NULL DEFAULT ''::text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "club_events_check" CHECK ((ends_at > starts_at)),
  CONSTRAINT "club_events_id_club_id_key" UNIQUE (id, club_id),
  CONSTRAINT "club_events_location_check" CHECK ((length(btrim(location)) > 0)),
  CONSTRAINT "club_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "club_events_poster_check" CHECK ((poster = ANY (ARRAY['film'::text, 'photo'::text, 'outdoor'::text]))),
  CONSTRAINT "club_events_public_id_key" UNIQUE (public_id),
  CONSTRAINT "club_events_slug_key" UNIQUE (slug),
  CONSTRAINT "club_events_title_check" CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 200)))
);

ALTER TABLE "public"."club_events"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."club_events" FROM "anon", "authenticated";

CREATE TABLE "public"."club_follows" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "public_id"  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "club_id"    bigint                   NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "club_follows_pkey" PRIMARY KEY (id),
  CONSTRAINT "club_follows_public_id_key" UNIQUE (public_id),
  "profile_id" bigint                   NOT NULL DEFAULT private.current_profile_id(),
  CONSTRAINT "club_follows_profile_id_club_id_key" UNIQUE (profile_id, club_id)
);

ALTER TABLE "public"."club_follows"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."club_follows" FROM "anon", "authenticated";

CREATE TABLE "public"."club_post_likes" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "public_id"  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "post_id"    bigint                   NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "club_post_likes_pkey" PRIMARY KEY (id),
  CONSTRAINT "club_post_likes_public_id_key" UNIQUE (public_id),
  "profile_id" bigint                   NOT NULL DEFAULT private.current_profile_id(),
  CONSTRAINT "club_post_likes_profile_id_post_id_key" UNIQUE (profile_id, post_id)
);

ALTER TABLE "public"."club_post_likes"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."club_post_likes" FROM "anon", "authenticated";

CREATE TABLE "public"."club_post_saves" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "public_id"  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "post_id"    bigint                   NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "club_post_saves_pkey" PRIMARY KEY (id),
  CONSTRAINT "club_post_saves_public_id_key" UNIQUE (public_id),
  "profile_id" bigint                   NOT NULL DEFAULT private.current_profile_id(),
  CONSTRAINT "club_post_saves_profile_id_post_id_key" UNIQUE (profile_id, post_id)
);

ALTER TABLE "public"."club_post_saves"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."club_post_saves" FROM "anon", "authenticated";

CREATE TABLE "public"."club_posts" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "public_id"  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "club_id"    bigint                   NOT NULL,
  "event_id"   bigint,
  "body"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "club_posts_body_check" CHECK (((length(btrim(body)) >= 1) AND (length(btrim(body)) <= 10000))),
  CONSTRAINT "club_posts_pkey" PRIMARY KEY (id),
  CONSTRAINT "club_posts_public_id_key" UNIQUE (public_id),
  "author_id"  bigint                   NOT NULL DEFAULT private.current_profile_id()
);

ALTER TABLE "public"."club_posts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."club_posts" FROM "anon", "authenticated";

CREATE TABLE "public"."clubs" (
  "id"          bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "public_id"   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"        text                     NOT NULL,
  "name"        text                     NOT NULL,
  "handle"      text                     NOT NULL,
  "mark"        text                     NOT NULL DEFAULT '✳'::text,
  "color"       text                     NOT NULL DEFAULT 'plum'::text,
  "category"    text                     NOT NULL,
  "description" text                     NOT NULL DEFAULT ''::text,
  "meeting"     text                     NOT NULL DEFAULT ''::text,
  "location"    text                     NOT NULL DEFAULT ''::text,
  "leader_id"   bigint                   NOT NULL,
  "is_sample"   boolean                  NOT NULL DEFAULT false,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "clubs_color_check" CHECK ((color = ANY (ARRAY['plum'::text, 'forest'::text, 'blue'::text, 'gold'::text, 'rose'::text]))),
  CONSTRAINT "clubs_handle_key" UNIQUE (handle),
  CONSTRAINT "clubs_name_check" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 200))),
  CONSTRAINT "clubs_pkey" PRIMARY KEY (id),
  CONSTRAINT "clubs_public_id_key" UNIQUE (public_id),
  CONSTRAINT "clubs_slug_check" CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT "clubs_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."clubs"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."clubs" FROM "anon", "authenticated";

ALTER TABLE "public"."listings"
  ADD COLUMN "is_sample" boolean NOT NULL DEFAULT false;

REVOKE ALL ON SEQUENCE "public"."club_event_rsvps_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."club_event_rsvps_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."club_events_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."club_events_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."club_follows_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."club_follows_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."club_post_likes_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."club_post_likes_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."club_post_saves_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."club_post_saves_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."club_posts_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."club_posts_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."clubs_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."clubs_id_seq" FROM "authenticated";

CREATE OR REPLACE FUNCTION private.club_follower_count (
  club bigint
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select count(*)::int from public.club_follows
  where club_id = club and (select private.current_role()) is not null
$function$;

CREATE OR REPLACE FUNCTION private.club_post_like_count (
  post bigint
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select count(*)::int from public.club_post_likes
  where post_id = post and (select private.current_role()) is not null
$function$;

ALTER TABLE "public"."club_event_rsvps"
  ADD CONSTRAINT "club_event_rsvps_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.club_events(id) ON DELETE CASCADE;

ALTER TABLE "public"."club_posts"
  ADD CONSTRAINT "club_posts_event_id_club_id_fkey" FOREIGN KEY (event_id, club_id) REFERENCES public.club_events(id, club_id) ON DELETE CASCADE;

ALTER TABLE "public"."club_post_likes"
  ADD CONSTRAINT "club_post_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.club_posts(id) ON DELETE CASCADE;

ALTER TABLE "public"."club_post_saves"
  ADD CONSTRAINT "club_post_saves_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.club_posts(id) ON DELETE CASCADE;

ALTER TABLE "public"."clubs"
  ADD CONSTRAINT "clubs_leader_id_fkey" FOREIGN KEY (leader_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."club_events"
  ADD CONSTRAINT "club_events_club_id_fkey" FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;

ALTER TABLE "public"."club_follows"
  ADD CONSTRAINT "club_follows_club_id_fkey" FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;

ALTER TABLE "public"."club_posts"
  ADD CONSTRAINT "club_posts_club_id_fkey" FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;

CREATE INDEX club_event_rsvps_event_idx ON public.club_event_rsvps USING btree (event_id);

CREATE INDEX club_events_club_idx ON public.club_events USING btree (club_id, starts_at);

CREATE INDEX club_events_start_idx ON public.club_events USING btree (starts_at);

CREATE INDEX club_follows_club_idx ON public.club_follows USING btree (club_id);

CREATE INDEX club_post_likes_post_idx ON public.club_post_likes USING btree (post_id);

CREATE INDEX club_post_saves_post_idx ON public.club_post_saves USING btree (post_id);

CREATE INDEX club_posts_club_idx ON public.club_posts USING btree (club_id, created_at DESC);

CREATE INDEX club_posts_event_idx ON public.club_posts USING btree (event_id, club_id);

CREATE INDEX club_posts_feed_idx ON public.club_posts USING btree (created_at DESC, id DESC);

CREATE INDEX clubs_leader_idx ON public.clubs USING btree (leader_id);

CREATE TRIGGER club_events_updated_at
  BEFORE UPDATE ON public.club_events
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE POLICY "campus_read" ON "public"."club_events"
  FOR SELECT
  TO "hootus_api"
  USING ((( SELECT private."current_role"() AS "current_role") IS NOT NULL));

CREATE POLICY "club_events_publish" ON "public"."club_events"
  FOR INSERT
  TO "hootus_api"
  WITH
    CHECK
    (((( SELECT private."current_role"() AS "current_role") = 'admin'::text) OR ((( SELECT private."current_role"() AS "current_role") = 'club_leader'::text) AND (EXISTS ( SELECT 1
   FROM public.clubs c
  WHERE ((c.id = club_events.club_id) AND (c.leader_id = ( SELECT private.current_profile_id() AS current_profile_id))))))));

CREATE POLICY "campus_read" ON "public"."club_posts"
  FOR SELECT
  TO "hootus_api"
  USING ((( SELECT private."current_role"() AS "current_role") IS NOT NULL));

CREATE POLICY "campus_read" ON "public"."clubs"
  FOR SELECT
  TO "hootus_api"
  USING ((( SELECT private."current_role"() AS "current_role") IS NOT NULL));

REVOKE ALL ON FUNCTION "private"."club_follower_count"(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."club_follower_count"(bigint) TO "hootus_api";

REVOKE ALL ON FUNCTION "private"."club_post_like_count"(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."club_post_like_count"(bigint) TO "hootus_api";

GRANT USAGE ON SEQUENCE "public"."club_event_rsvps_id_seq" TO "hootus_api";

REVOKE ALL ON SEQUENCE "public"."club_event_rsvps_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_event_rsvps_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."club_event_rsvps_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_event_rsvps_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."club_events_id_seq" TO "hootus_api";

REVOKE ALL ON SEQUENCE "public"."club_events_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_events_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."club_events_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_events_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."club_follows_id_seq" TO "hootus_api";

REVOKE ALL ON SEQUENCE "public"."club_follows_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_follows_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."club_follows_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_follows_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."club_post_likes_id_seq" TO "hootus_api";

REVOKE ALL ON SEQUENCE "public"."club_post_likes_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_post_likes_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."club_post_likes_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_post_likes_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."club_post_saves_id_seq" TO "hootus_api";

REVOKE ALL ON SEQUENCE "public"."club_post_saves_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_post_saves_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."club_post_saves_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_post_saves_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."club_posts_id_seq" TO "hootus_api";

REVOKE ALL ON SEQUENCE "public"."club_posts_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_posts_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."club_posts_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."club_posts_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE "public"."clubs_id_seq" TO "hootus_api";

REVOKE ALL ON SEQUENCE "public"."clubs_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."clubs_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."clubs_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."clubs_id_seq" TO "service_role";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."club_event_rsvps" TO "hootus_api";

REVOKE ALL ON TABLE "public"."club_event_rsvps" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_event_rsvps" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_event_rsvps" TO "service_role";

GRANT INSERT ("club_id") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("description") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("ends_at") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("event_type") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("location") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("note") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("poster") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("price") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("starts_at") ON TABLE "public"."club_events" TO "hootus_api";

GRANT INSERT ("title") ON TABLE "public"."club_events" TO "hootus_api";

GRANT SELECT ON TABLE "public"."club_events" TO "hootus_api";

REVOKE ALL ON TABLE "public"."club_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_events" TO "service_role";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."club_follows" TO "hootus_api";

REVOKE ALL ON TABLE "public"."club_follows" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_follows" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_follows" TO "service_role";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."club_post_likes" TO "hootus_api";

REVOKE ALL ON TABLE "public"."club_post_likes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_post_likes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_post_likes" TO "service_role";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."club_post_saves" TO "hootus_api";

REVOKE ALL ON TABLE "public"."club_post_saves" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_post_saves" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_post_saves" TO "service_role";

GRANT INSERT ("body") ON TABLE "public"."club_posts" TO "hootus_api";

GRANT INSERT ("club_id") ON TABLE "public"."club_posts" TO "hootus_api";

GRANT INSERT ("event_id") ON TABLE "public"."club_posts" TO "hootus_api";

GRANT SELECT ON TABLE "public"."club_posts" TO "hootus_api";

REVOKE ALL ON TABLE "public"."club_posts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_posts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."club_posts" TO "service_role";

GRANT SELECT ON TABLE "public"."clubs" TO "hootus_api";

REVOKE ALL ON TABLE "public"."clubs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."clubs" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."clubs" TO "service_role";

ALTER TABLE "public"."club_event_rsvps"
  ADD CONSTRAINT "club_event_rsvps_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "own_delete" ON "public"."club_event_rsvps"
  FOR DELETE
  TO "hootus_api"
  USING (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

CREATE POLICY "own_insert" ON "public"."club_event_rsvps"
  FOR INSERT
  TO "hootus_api"
  WITH CHECK (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

CREATE POLICY "own_read" ON "public"."club_event_rsvps"
  FOR SELECT
  TO "hootus_api"
  USING (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

ALTER TABLE "public"."club_follows"
  ADD CONSTRAINT "club_follows_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "own_delete" ON "public"."club_follows"
  FOR DELETE
  TO "hootus_api"
  USING (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

CREATE POLICY "own_insert" ON "public"."club_follows"
  FOR INSERT
  TO "hootus_api"
  WITH CHECK (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

CREATE POLICY "own_read" ON "public"."club_follows"
  FOR SELECT
  TO "hootus_api"
  USING (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

ALTER TABLE "public"."club_post_likes"
  ADD CONSTRAINT "club_post_likes_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "own_delete" ON "public"."club_post_likes"
  FOR DELETE
  TO "hootus_api"
  USING (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

CREATE POLICY "own_insert" ON "public"."club_post_likes"
  FOR INSERT
  TO "hootus_api"
  WITH CHECK (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

CREATE POLICY "own_read" ON "public"."club_post_likes"
  FOR SELECT
  TO "hootus_api"
  USING (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

ALTER TABLE "public"."club_post_saves"
  ADD CONSTRAINT "club_post_saves_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "own_delete" ON "public"."club_post_saves"
  FOR DELETE
  TO "hootus_api"
  USING (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

CREATE POLICY "own_insert" ON "public"."club_post_saves"
  FOR INSERT
  TO "hootus_api"
  WITH CHECK (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

CREATE POLICY "own_read" ON "public"."club_post_saves"
  FOR SELECT
  TO "hootus_api"
  USING (((( SELECT private."current_role"() AS "current_role") IS NOT NULL) AND (profile_id = ( SELECT private.current_profile_id() AS current_profile_id))));

ALTER TABLE "public"."club_posts"
  ADD CONSTRAINT "club_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id);

CREATE INDEX club_posts_author_idx ON public.club_posts USING btree (author_id);

CREATE POLICY "club_posts_publish" ON "public"."club_posts"
  FOR INSERT
  TO "hootus_api"
  WITH
    CHECK
    (((author_id = ( SELECT private.current_profile_id() AS current_profile_id)) AND ((( SELECT private."current_role"() AS "current_role") = 'admin'::text) OR ((( SELECT
    private."current_role"() AS "current_role") = 'club_leader'::text) AND (EXISTS ( SELECT 1
   FROM public.clubs c
  WHERE ((c.id = club_posts.club_id) AND (c.leader_id = ( SELECT private.current_profile_id() AS current_profile_id)))))))));

GRANT INSERT ("author_id") ON TABLE "public"."club_posts" TO "hootus_api";


-- Keep explicit browser/PUBLIC denials on fresh projects regardless of defaults.
revoke all on public.clubs, public.club_events, public.club_posts,
  public.club_follows, public.club_post_likes, public.club_post_saves,
  public.club_event_rsvps from public, anon, authenticated;
revoke all on function private.club_follower_count(bigint),
  private.club_post_like_count(bigint) from public, anon, authenticated;

commit;
