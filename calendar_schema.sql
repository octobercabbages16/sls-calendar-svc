-- Calendar App Schema

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS portal;

-- Users of the calendar system
CREATE TABLE portal.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Calendars owned by users (a user can have multiple calendars)
CREATE TABLE portal.calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color like #FF5733
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events within a calendar
CREATE TABLE portal.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
    visibility VARCHAR(20) NOT NULL DEFAULT 'default'
        CHECK (visibility IN ('default', 'public', 'private')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Recurrence rules for repeating events (RFC 5545 inspired)
CREATE TABLE portal.recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    frequency VARCHAR(10) NOT NULL
        CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    interval_value INT NOT NULL DEFAULT 1,
    by_day VARCHAR(50),       -- e.g., 'MO,WE,FR'
    by_month_day VARCHAR(100),-- e.g., '1,15'
    by_month VARCHAR(50),     -- e.g., '1,6' (Jan, Jun)
    count INT,                -- number of occurrences (NULL = no limit)
    until_date TIMESTAMPTZ,   -- end date (NULL = no end)

    CONSTRAINT recurrence_end_check CHECK (
        NOT (count IS NOT NULL AND until_date IS NOT NULL)
    )
);

-- Exceptions to recurrence (skipped or modified occurrences)
CREATE TABLE portal.recurrence_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    original_start_time TIMESTAMPTZ NOT NULL, -- which occurrence this replaces
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    replacement_event_id UUID,

    UNIQUE (event_id, original_start_time)
);

-- Event attendees / invitations
CREATE TABLE portal.event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    user_id UUID,
    email VARCHAR(255) NOT NULL, -- allows inviting non-users
    display_name VARCHAR(255),
    rsvp_status VARCHAR(20) NOT NULL DEFAULT 'needs_action'
        CHECK (rsvp_status IN ('needs_action', 'accepted', 'declined', 'tentative')),
    role VARCHAR(20) NOT NULL DEFAULT 'attendee'
        CHECK (role IN ('organizer', 'attendee', 'optional')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (event_id, email)
);

-- Reminders / notifications for events
CREATE TABLE portal.event_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'notification'
        CHECK (method IN ('notification', 'email')),
    minutes_before INT NOT NULL DEFAULT 15,

    UNIQUE (event_id, user_id, method, minutes_before)
);

-- Shared calendar access (allowing other users to view/edit calendars)
CREATE TABLE portal.calendar_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL,
    shared_with_user_id UUID NOT NULL,
    permission VARCHAR(20) NOT NULL DEFAULT 'read'
        CHECK (permission IN ('read', 'write', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (calendar_id, shared_with_user_id)
);

-- Indexes for common query patterns
CREATE INDEX idx_calendars_owner ON portal.calendars(owner_id);
CREATE INDEX idx_events_calendar ON portal.events(calendar_id);
CREATE INDEX idx_events_time_range ON portal.events(start_time, end_time);
CREATE INDEX idx_event_attendees_user ON portal.event_attendees(user_id);
CREATE INDEX idx_event_attendees_event ON portal.event_attendees(event_id);
CREATE INDEX idx_recurrence_rules_event ON portal.recurrence_rules(event_id);
CREATE INDEX idx_calendar_shares_user ON portal.calendar_shares(shared_with_user_id);
CREATE INDEX idx_event_reminders_event ON portal.event_reminders(event_id);
