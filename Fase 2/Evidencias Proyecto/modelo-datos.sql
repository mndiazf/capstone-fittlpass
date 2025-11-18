-- =========================================================
--  MODELO DE DATOS FITPASS - CONTROL DE ACCESOS Y MEMBRESÍAS
-- =========================================================

-- ==========================
-- public.app_user
-- ==========================
CREATE TABLE public.app_user (
  id varchar(255) NOT NULL,
  access_status varchar(16) NOT NULL,
  created_at timestamptz NOT NULL,
  email varchar(180) NOT NULL,
  first_name varchar(120) NOT NULL,
  last_name varchar(120) NOT NULL,
  middle_name varchar(120) NULL,
  password_hash varchar(255) NOT NULL,
  phone varchar(32) NULL,
  rut varchar(20) NOT NULL,
  second_last_name varchar(120) NULL,
  status varchar(16) NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT app_user_access_status_check CHECK (
    (access_status)::text = ANY (
      (ARRAY[
        'NO_ENROLADO'::varchar,
        'ACTIVO'::varchar,
        'BLOQUEADO'::varchar
      ])::text[]
    )
  ),
  CONSTRAINT app_user_email_key UNIQUE (email),
  CONSTRAINT app_user_pkey PRIMARY KEY (id),
  CONSTRAINT app_user_rut_key UNIQUE (rut)
);

-- ==========================
-- public.branch
-- ==========================
CREATE TABLE public.branch (
  id varchar(36) NOT NULL,
  active bool NOT NULL,
  address varchar(240) NULL,
  code varchar(48) NOT NULL,
  "name" varchar(160) NOT NULL,
  CONSTRAINT branch_code_key UNIQUE (code),
  CONSTRAINT branch_pkey PRIMARY KEY (id)
);

-- ==========================
-- public.membership_plan
-- ==========================
CREATE TABLE public.membership_plan (
  code varchar(64) NOT NULL,
  "name" varchar(120) NOT NULL,
  description varchar(255) NULL,
  price numeric(12, 2) NOT NULL,
  duration_months int4 NOT NULL,
  plan_scope varchar(16) NOT NULL,
  is_usage_limited bool DEFAULT false NOT NULL,
  max_days_per_period int4 NULL,
  period_unit varchar(8) NULL,
  period_length int4 NULL,
  CONSTRAINT membership_plan_period_unit_check CHECK (
    (period_unit)::text = ANY (
      (ARRAY[
        'WEEK'::varchar,
        'MONTH'::varchar,
        'TOTAL'::varchar
      ])::text[]
    )
  ),
  CONSTRAINT membership_plan_pkey PRIMARY KEY (code),
  CONSTRAINT membership_plan_plan_scope_check CHECK (
    (plan_scope)::text = ANY (
      (ARRAY[
        'ONECLUB'::varchar,
        'MULTICLUB'::varchar
      ])::text[]
    )
  )
);

-- ==========================
-- public.ui_permission
-- ==========================
CREATE TABLE public.ui_permission (
  id varchar(36) NOT NULL,
  code varchar(64) NOT NULL,
  "name" varchar(120) NOT NULL,
  description varchar(255) NULL,
  CONSTRAINT ui_permission_code_key UNIQUE (code),
  CONSTRAINT ui_permission_pkey PRIMARY KEY (id)
);

-- ==========================
-- public.user_profile
-- ==========================
CREATE TABLE public.user_profile (
  id varchar(36) NOT NULL,
  "name" varchar(120) NOT NULL,
  description varchar(255) NULL,
  is_default bool DEFAULT false NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT user_profile_name_key UNIQUE ("name"),
  CONSTRAINT user_profile_pkey PRIMARY KEY (id)
);

-- ==========================
-- public.user_role
-- ==========================
CREATE TABLE public.user_role (
  id varchar(36) NOT NULL,
  code varchar(64) NOT NULL,
  "name" varchar(120) NOT NULL,
  description varchar(255) NULL,
  role_kind varchar(16) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT user_role_code_key UNIQUE (code),
  CONSTRAINT user_role_pkey PRIMARY KEY (id),
  CONSTRAINT user_role_role_kind_check CHECK (
    (role_kind)::text = ANY (
      (ARRAY[
        'MEMBER'::varchar,
        'STAFF'::varchar
      ])::text[]
    )
  )
);

-- ==========================
-- public.app_user_profile
-- ==========================
CREATE TABLE public.app_user_profile (
  id varchar(36) NOT NULL,
  user_id varchar(255) NOT NULL,
  profile_id varchar(36) NOT NULL,
  branch_id varchar(36) NULL,
  active bool DEFAULT true NOT NULL,
  created_at timestamptz NOT NULL,
  ended_at timestamptz NULL,
  CONSTRAINT app_user_profile_pkey PRIMARY KEY (id),
  CONSTRAINT app_user_profile_user_id_profile_id_branch_id_key
    UNIQUE (user_id, profile_id, branch_id),
  CONSTRAINT app_user_profile_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branch(id),
  CONSTRAINT app_user_profile_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.user_profile(id),
  CONSTRAINT app_user_profile_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_user(id)
);

CREATE INDEX ix_app_user_profile_user
  ON public.app_user_profile USING btree (user_id);

-- ==========================
-- public.app_user_role
-- ==========================
CREATE TABLE public.app_user_role (
  id varchar(36) NOT NULL,
  user_id varchar(255) NOT NULL,
  role_id varchar(36) NOT NULL,
  branch_id varchar(36) NULL,
  active bool DEFAULT true NULL,
  created_at timestamptz NOT NULL,
  ended_at timestamptz NULL,
  CONSTRAINT app_user_role_pkey PRIMARY KEY (id),
  CONSTRAINT app_user_role_user_id_role_id_branch_id_key
    UNIQUE (user_id, role_id, branch_id),
  CONSTRAINT app_user_role_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branch(id),
  CONSTRAINT app_user_role_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.user_role(id),
  CONSTRAINT app_user_role_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_user(id)
);

CREATE INDEX ix_app_user_role_role
  ON public.app_user_role USING btree (role_id);

CREATE INDEX ix_app_user_role_user
  ON public.app_user_role USING btree (user_id);

-- ==========================
-- public.branch_opening_hours
-- ==========================
CREATE TABLE public.branch_opening_hours (
  id varchar(36) NOT NULL,
  branch_id varchar(36) NOT NULL,
  day_of_week int2 NOT NULL,
  open_time time NOT NULL,
  close_time time NOT NULL,
  CONSTRAINT branch_opening_hours_branch_id_day_of_week_key
    UNIQUE (branch_id, day_of_week),
  CONSTRAINT branch_opening_hours_day_of_week_check CHECK (
    day_of_week >= 1 AND day_of_week <= 7
  ),
  CONSTRAINT branch_opening_hours_pkey PRIMARY KEY (id),
  CONSTRAINT branch_opening_hours_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branch(id)
);

-- ==========================
-- public.branch_status
-- ==========================
CREATE TABLE public.branch_status (
  branch_id varchar(36) NOT NULL,
  status varchar(16) NOT NULL,
  updated_at timestamptz NOT NULL,
  reason varchar(255) NULL,
  CONSTRAINT branch_status_pkey PRIMARY KEY (branch_id),
  CONSTRAINT branch_status_status_check CHECK (
    (status)::text = ANY (
      (ARRAY[
        'OPEN'::varchar,
        'CLOSED'::varchar,
        'TEMP_CLOSED'::varchar
      ])::text[]
    )
  ),
  CONSTRAINT branch_status_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branch(id)
);

-- ==========================
-- public.face_enrollment
-- ==========================
CREATE TABLE public.face_enrollment (
  id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL,
  embedding public.vector NULL,
  status varchar(20) NOT NULL,
  updated_at timestamptz NOT NULL,
  user_id varchar(255) NOT NULL,
  CONSTRAINT face_enrollment_pkey PRIMARY KEY (id),
  CONSTRAINT face_enrollment_status_check CHECK (
    (status)::text = ANY (
      (ARRAY[
        'NOT_ENROLLED'::varchar,
        'ENROLLED'::varchar
      ])::text[]
    )
  ),
  CONSTRAINT face_enrollment_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_user(id)
);

CREATE INDEX ix_face_enrollment_user
  ON public.face_enrollment USING btree (user_id);

-- ==========================
-- public.role_access_template
-- ==========================
CREATE TABLE public.role_access_template (
  id varchar(36) NOT NULL,
  role_id varchar(36) NOT NULL,
  branch_id varchar(36) NOT NULL,
  "name" varchar(120) NOT NULL,
  is_default bool DEFAULT false NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT role_access_template_pkey PRIMARY KEY (id),
  CONSTRAINT role_access_template_role_id_branch_id_name_key
    UNIQUE (role_id, branch_id, "name"),
  CONSTRAINT role_access_template_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branch(id),
  CONSTRAINT role_access_template_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.user_role(id)
);

-- ==========================
-- public.user_access_assignment
-- ==========================
CREATE TABLE public.user_access_assignment (
  id varchar(36) NOT NULL,
  user_id varchar(255) NOT NULL,
  template_id varchar(36) NOT NULL,
  valid_from date NOT NULL,
  valid_to date NULL,
  is_active bool DEFAULT true NULL,
  CONSTRAINT user_access_assignment_pkey PRIMARY KEY (id),
  CONSTRAINT user_access_assignment_user_id_template_id_valid_from_key
    UNIQUE (user_id, template_id, valid_from),
  CONSTRAINT user_access_assignment_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES public.role_access_template(id),
  CONSTRAINT user_access_assignment_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_user(id)
);

CREATE INDEX ix_user_access_assignment_user
  ON public.user_access_assignment USING btree (user_id);

-- ==========================
-- public.user_membership
-- ==========================
CREATE TABLE public.user_membership (
  id varchar(255) NOT NULL,
  plan_code varchar(64) NOT NULL,
  user_id varchar(255) NOT NULL,
  branch_id varchar(36) NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar(16) NOT NULL,
  CONSTRAINT user_membership_pkey PRIMARY KEY (id),
  CONSTRAINT user_membership_status_check CHECK (
    (status)::text = ANY (
      (ARRAY[
        'ACTIVE'::varchar,
        'EXPIRED'::varchar
      ])::text[]
    )
  ),
  CONSTRAINT user_membership_user_id_key UNIQUE (user_id),
  CONSTRAINT user_membership_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branch(id),
  CONSTRAINT user_membership_plan_code_fkey
    FOREIGN KEY (plan_code) REFERENCES public.membership_plan(code),
  CONSTRAINT user_membership_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_user(id)
);

CREATE INDEX ix_user_membership_plan
  ON public.user_membership USING btree (plan_code);

CREATE INDEX ix_user_membership_user
  ON public.user_membership USING btree (user_id);

-- ==========================
-- public.user_profile_permission
-- ==========================
CREATE TABLE public.user_profile_permission (
  profile_id varchar(36) NOT NULL,
  permission_id varchar(36) NOT NULL,
  can_view bool DEFAULT true NULL,
  can_edit bool DEFAULT false NULL,
  CONSTRAINT user_profile_permission_pkey
    PRIMARY KEY (profile_id, permission_id),
  CONSTRAINT user_profile_permission_permission_id_fkey
    FOREIGN KEY (permission_id) REFERENCES public.ui_permission(id) ON DELETE CASCADE,
  CONSTRAINT user_profile_permission_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.user_profile(id) ON DELETE CASCADE
);

-- ==========================
-- public.access_log
-- ==========================
CREATE TABLE public.access_log (
  id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL,
  device_id varchar(80) NULL,
  reason varchar(120) NULL,
  "result" varchar(16) NOT NULL,
  "source" varchar(16) NOT NULL,
  branch_id varchar(36) NOT NULL,
  user_id varchar(255) NOT NULL,
  membership_id varchar(255) NULL,
  CONSTRAINT access_log_pkey PRIMARY KEY (id),
  CONSTRAINT access_log_result_check CHECK (
    ("result")::text = ANY (
      (ARRAY[
        'GRANTED'::varchar,
        'DENIED'::varchar
      ])::text[]
    )
  ),
  CONSTRAINT access_log_source_check CHECK (
    ("source")::text = ANY (
      (ARRAY[
        'FACE'::varchar,
        'MANUAL'::varchar,
        'BACKOFFICE'::varchar,
        'TEST'::varchar
      ])::text[]
    )
  ),
  CONSTRAINT access_log_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branch(id),
  CONSTRAINT access_log_membership_id_fkey
    FOREIGN KEY (membership_id) REFERENCES public.user_membership(id),
  CONSTRAINT access_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_user(id)
);

CREATE INDEX ix_accesslog_at
  ON public.access_log USING btree (created_at);

CREATE INDEX ix_accesslog_branch
  ON public.access_log USING btree (branch_id);

CREATE INDEX ix_accesslog_user
  ON public.access_log USING btree (user_id);

-- ==========================
-- public.membership_day_usage
-- ==========================
CREATE TABLE public.membership_day_usage (
  id varchar(36) NOT NULL,
  membership_id varchar(255) NOT NULL,
  usage_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT membership_day_usage_membership_id_usage_date_key
    UNIQUE (membership_id, usage_date),
  CONSTRAINT membership_day_usage_pkey PRIMARY KEY (id),
  CONSTRAINT membership_day_usage_membership_id_fkey
    FOREIGN KEY (membership_id) REFERENCES public.user_membership(id)
);

CREATE INDEX ix_membership_day_usage_period
  ON public.membership_day_usage USING btree (membership_id, period_start, period_end);

-- ==========================
-- public.membership_payment
-- ==========================
CREATE TABLE public.membership_payment (
  id varchar(36) NOT NULL,
  membership_id varchar(255) NOT NULL,
  user_id varchar(255) NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency varchar(3) DEFAULT 'CLP'::varchar NOT NULL,
  paid_at timestamptz NOT NULL,
  card_type varchar(16) NULL,
  card_brand varchar(32) NULL,
  card_last4 varchar(4) NULL,
  CONSTRAINT membership_payment_pkey PRIMARY KEY (id),
  CONSTRAINT membership_payment_membership_id_fkey
    FOREIGN KEY (membership_id) REFERENCES public.user_membership(id),
  CONSTRAINT membership_payment_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_user(id)
);

CREATE INDEX ix_membership_payment_membership
  ON public.membership_payment USING btree (membership_id);

CREATE INDEX ix_membership_payment_user
  ON public.membership_payment USING btree (user_id);

-- ==========================
-- public.role_access_slot
-- ==========================
CREATE TABLE public.role_access_slot (
  id varchar(36) NOT NULL,
  template_id varchar(36) NOT NULL,
  day_of_week int2 NOT NULL,
  "hour" int2 NOT NULL,
  allow bool DEFAULT true NULL,
  CONSTRAINT role_access_slot_day_of_week_check CHECK (
    day_of_week >= 1 AND day_of_week <= 7
  ),
  CONSTRAINT role_access_slot_hour_check CHECK (
    "hour" >= 0 AND "hour" <= 23
  ),
  CONSTRAINT role_access_slot_pkey PRIMARY KEY (id),
  CONSTRAINT role_access_slot_template_id_day_of_week_hour_key
    UNIQUE (template_id, day_of_week, "hour"),
  CONSTRAINT role_access_slot_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES public.role_access_template(id) ON DELETE CASCADE
);

CREATE INDEX ix_role_access_slot_template
  ON public.role_access_slot USING btree (template_id, day_of_week, "hour");
