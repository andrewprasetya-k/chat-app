


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."cm_type" AS ENUM (
    'user',
    'system'
);


ALTER TYPE "public"."cm_type" OWNER TO "postgres";


CREATE TYPE "public"."crm_role" AS ENUM (
    'member',
    'admin',
    'personal'
);


ALTER TYPE "public"."crm_role" OWNER TO "postgres";


CREATE TYPE "public"."role" AS ENUM (
    'admin',
    'pengajar',
    'murid'
);


ALTER TYPE "public"."role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_attachment" (
    "ca_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ca_cm_id" "uuid",
    "file_url" "text",
    "file_type" character varying(50),
    "uploaded_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_attachment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_message" (
    "cm_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cm_cr_id" "uuid" NOT NULL,
    "cm_usr_id" "uuid" NOT NULL,
    "message_text" "text",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text"),
    "cm_reply_to_id" "uuid",
    "cm_type" "public"."cm_type" DEFAULT 'user'::"public"."cm_type"
);


ALTER TABLE "public"."chat_message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_room" (
    "cr_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cr_name" character varying(100),
    "cr_is_group" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "cr_private" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "cr_avatar" "text"
);


ALTER TABLE "public"."chat_room" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_room_member" (
    "crm_cr_id" "uuid" NOT NULL,
    "crm_usr_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone,
    "leave_at" timestamp with time zone,
    "crm_join_approved" boolean DEFAULT false NOT NULL,
    "crm_role" "public"."crm_role",
    "crm_added_approved_by" "uuid",
    "crm_removed_by" "uuid",
    "crm_join_request_at" timestamp with time zone,
    "crm_added_by" "uuid"
);


ALTER TABLE "public"."chat_room_member" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."read_receipts" (
    "rr_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rr_cm_id" "uuid" NOT NULL,
    "rr_usr_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."read_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user" (
    "usr_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usr_nama_lengkap" character varying(150),
    "usr_email" character varying(150) NOT NULL,
    "usr_password" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "usr_last_seen" timestamp with time zone,
    "usr_avatar" "text",
    "usr_is_online" boolean DEFAULT false NOT NULL,
    "usr_refresh_token" "text",
    "usr_is_verified" boolean DEFAULT false NOT NULL,
    "usr_verification_token" "text"
);


ALTER TABLE "public"."user" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chat_attachment"
    ADD CONSTRAINT "chat_attachment_pkey" PRIMARY KEY ("ca_id");



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_pkey" PRIMARY KEY ("cm_id");



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_pkey" PRIMARY KEY ("crm_cr_id", "crm_usr_id");



ALTER TABLE ONLY "public"."chat_room"
    ADD CONSTRAINT "chat_room_pkey" PRIMARY KEY ("cr_id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."read_receipts"
    ADD CONSTRAINT "read_receipts_pkey" PRIMARY KEY ("rr_id");



ALTER TABLE ONLY "public"."read_receipts"
    ADD CONSTRAINT "unique_message_reader" UNIQUE ("rr_cm_id", "rr_usr_id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("usr_id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_usr_email_key" UNIQUE ("usr_email");



CREATE INDEX "idx_read_receipts_message_id" ON "public"."read_receipts" USING "btree" ("rr_cm_id");



CREATE INDEX "idx_read_receipts_reader_id" ON "public"."read_receipts" USING "btree" ("rr_usr_id");



ALTER TABLE ONLY "public"."chat_attachment"
    ADD CONSTRAINT "chat_attachment_ca_cm_id_fkey" FOREIGN KEY ("ca_cm_id") REFERENCES "public"."chat_message"("cm_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_cm_cr_id_fkey" FOREIGN KEY ("cm_cr_id") REFERENCES "public"."chat_room"("cr_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_cm_reply_to_id_fkey" FOREIGN KEY ("cm_reply_to_id") REFERENCES "public"."chat_message"("cm_id");



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_cm_usr_id_fkey" FOREIGN KEY ("cm_usr_id") REFERENCES "public"."user"("usr_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room"
    ADD CONSTRAINT "chat_room_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("usr_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_crm_added_approved_by_fkey" FOREIGN KEY ("crm_added_approved_by") REFERENCES "public"."user"("usr_id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_crm_added_by_fkey" FOREIGN KEY ("crm_added_by") REFERENCES "public"."user"("usr_id");



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_crm_cr_id_fkey" FOREIGN KEY ("crm_cr_id") REFERENCES "public"."chat_room"("cr_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_crm_removed_by_fkey" FOREIGN KEY ("crm_removed_by") REFERENCES "public"."user"("usr_id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_room_member"
    ADD CONSTRAINT "chat_room_member_crm_usr_id_fkey" FOREIGN KEY ("crm_usr_id") REFERENCES "public"."user"("usr_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."read_receipts"
    ADD CONSTRAINT "fk_read_message" FOREIGN KEY ("rr_cm_id") REFERENCES "public"."chat_message"("cm_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."read_receipts"
    ADD CONSTRAINT "fk_reader_user" FOREIGN KEY ("rr_usr_id") REFERENCES "public"."user"("usr_id") ON DELETE CASCADE;



ALTER TABLE "public"."chat_attachment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_message" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_room" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_room_member" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."read_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."chat_attachment" TO "anon";
GRANT ALL ON TABLE "public"."chat_attachment" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_attachment" TO "service_role";



GRANT ALL ON TABLE "public"."chat_message" TO "anon";
GRANT ALL ON TABLE "public"."chat_message" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_message" TO "service_role";



GRANT ALL ON TABLE "public"."chat_room" TO "anon";
GRANT ALL ON TABLE "public"."chat_room" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_room" TO "service_role";



GRANT ALL ON TABLE "public"."chat_room_member" TO "anon";
GRANT ALL ON TABLE "public"."chat_room_member" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_room_member" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."read_receipts" TO "anon";
GRANT ALL ON TABLE "public"."read_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."read_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







