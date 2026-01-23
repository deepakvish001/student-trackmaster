
# Complete Database Setup Plan

## Summary
This plan recreates the complete database schema that was previously configured in your old project. The new Lovable Cloud backend currently has no tables, so we need to create all tables, functions, triggers, and RLS policies from scratch.

---

## Database Tables to Create

Based on the codebase analysis, the following tables are required:

### 1. **user_profiles** - Stores user profile data
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default uuid_generate_v4() |
| user_id | uuid | UNIQUE, NOT NULL, references auth.users(id) |
| full_name | text | NOT NULL |
| role | text | NOT NULL, default 'user', check (role in ('super_admin', 'user')) |
| avatar_url | text | nullable |
| is_active | boolean | NOT NULL, default true |
| max_batches_allowed | integer | default 1 |
| last_login_at | timestamptz | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 2. **batches** - Stores batch/class information
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default uuid_generate_v4() |
| batch_name | text | NOT NULL |
| serial_number | text | UNIQUE, NOT NULL |
| admin_name | text | NOT NULL |
| username | text | NOT NULL |
| max_students | integer | NOT NULL, default 50 |
| is_enabled | boolean | NOT NULL, default true |
| user_id | uuid | nullable, references auth.users(id) |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 3. **students** - Stores student records
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default uuid_generate_v4() |
| student_name | text | NOT NULL |
| mobile_number | text | nullable |
| email | text | nullable |
| mobile | text | nullable |
| address | text | nullable |
| batch_id | uuid | nullable, references batches(id) |
| is_enabled | boolean | NOT NULL, default true |
| user_id | uuid | nullable, references auth.users(id) |
| finger_1 | text | nullable |
| finger_2 | text | nullable |
| finger_3 | text | nullable |
| finger_4 | text | nullable |
| finger_5 | text | nullable |
| finger_1_image | text | nullable |
| finger_2_image | text | nullable |
| finger_3_image | text | nullable |
| finger_4_image | text | nullable |
| finger_5_image | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 4. **student_fingerprints** - Stores detailed fingerprint capture records
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default uuid_generate_v4() |
| student_id | uuid | NOT NULL, references students(id) ON DELETE CASCADE |
| finger_index | integer | NOT NULL |
| pid_data | text | NOT NULL |
| quality_score | integer | nullable |
| image_data | text | nullable |
| capture_timestamp | timestamptz | nullable |
| user_id | uuid | nullable, references auth.users(id) |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 5. **user_batch_access** - Maps users to batches they can access
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default uuid_generate_v4() |
| user_id | uuid | NOT NULL, references auth.users(id) ON DELETE CASCADE |
| batch_id | uuid | NOT NULL, references batches(id) ON DELETE CASCADE |
| granted_by | uuid | nullable, references auth.users(id) |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 6. **audit_logs** - Stores audit trail of all actions
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default uuid_generate_v4() |
| user_id | uuid | nullable, references auth.users(id) |
| action | text | NOT NULL |
| table_name | text | nullable |
| record_id | text | nullable |
| old_values | jsonb | nullable |
| new_values | jsonb | nullable |
| ip_address | text | nullable |
| user_agent | text | nullable |
| created_at | timestamptz | default now() |

### 7. **system_settings** - Stores system configuration key-value pairs
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default uuid_generate_v4() |
| key | text | UNIQUE, NOT NULL |
| value | jsonb | NOT NULL |
| category | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

---

## Database Functions Required

### 1. **handle_new_user()** - Trigger function to auto-create user profile
- Creates a new row in `user_profiles` when a user signs up

### 2. **handle_updated_at()** - Trigger function to auto-update timestamps
- Automatically sets `updated_at` column on record updates

### 3. **get_system_settings()** - RPC function to fetch all system settings
- Returns grouped settings by category

### 4. **update_system_settings(settings jsonb)** - RPC function to bulk update settings
- Upserts multiple settings at once

### 5. **toggle_user_status(target_user_id uuid, calling_user_id uuid)** - RPC function for user status toggle
- Safely toggles user account status with validation

### 6. **delete_user_account(target_user_id uuid)** - RPC function for user deletion
- Cleans up related records before account deletion

### 7. **update_user_status(target_user_id uuid, new_status boolean)** - RPC function
- Updates user active status

---

## Database Triggers Required

1. **on_auth_user_created** - Fires after INSERT on auth.users
   - Calls `handle_new_user()` to create profile

2. **handle_updated_at triggers** for each table
   - Fires before UPDATE to set `updated_at = now()`

---

## Row Level Security (RLS) Policies

### user_profiles
- Users can read their own profile
- Users can update their own profile
- Super admins can read all profiles
- Super admins can update all profiles

### batches
- Users can read batches they have access to (via user_batch_access)
- Super admins can read/write all batches
- Users can create batches (based on their max_batches_allowed)

### students
- Users can read/write students in batches they have access to
- Super admins can manage all students

### student_fingerprints
- Same access rules as students table

### user_batch_access
- Users can read their own access records
- Super admins can manage all access records

### audit_logs
- Only authenticated users can insert
- Super admins can read all logs
- Regular users can read their own logs

### system_settings
- Super admins can read/write all settings
- Regular users can read settings

---

## Real-time Subscriptions
Enable real-time updates for the following tables:
- batches
- students
- user_batch_access
- system_settings
- audit_logs

---

## Authentication Configuration
- Enable auto-confirm for email signups (no email verification required)
- This ensures users can log in immediately after signup

---

## Implementation Steps

1. **Create database migration** with all tables, indexes, and constraints
2. **Create database functions** for user management and system settings
3. **Create triggers** for automatic profile creation and timestamp updates
4. **Configure RLS policies** for all tables with proper security
5. **Enable real-time** for required tables
6. **Configure authentication** settings
7. **Deploy edge functions** (manage-users is already in place)
8. **Insert default system settings** data

---

## Technical Details

```text
Database Schema Diagram:

┌─────────────────┐     ┌─────────────────┐
│   auth.users    │────>│  user_profiles  │
│   (Supabase)    │     │                 │
└─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │ user_batch_access│
        │               └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│     batches     │<────│                 │
└─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────────┐
│    students     │────>│ student_fingerprints│
└─────────────────┘     └─────────────────────┘

┌─────────────────┐     ┌─────────────────┐
│   audit_logs    │     │ system_settings │
└─────────────────┘     └─────────────────┘
```

---

## Notes
- All existing code will work without modifications since we're recreating the exact same schema
- The manage-users edge function is already deployed and ready
- First user to sign up should be promoted to super_admin role manually or via a seed script
