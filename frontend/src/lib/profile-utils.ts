import type { CitizenProfile } from "./api-hooks";

const PROFILE_FIELDS: (keyof CitizenProfile)[] = [
  "full_name",
  "cnp",
  "address",
  "city",
  "phone",
  "email",
  "buletin_series",
  "buletin_number",
];

export function profileCompletion(profile: CitizenProfile | null | undefined) {
  const total = PROFILE_FIELDS.length;
  if (!profile) return { pct: 0, filled: 0, total };
  const filled = PROFILE_FIELDS.filter((k) => {
    const v = profile[k];
    return v != null && String(v).trim() !== "";
  }).length;
  return { pct: Math.round((filled / total) * 100), filled, total };
}

export function profileInitials(name: string | null | undefined, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function profileDisplayName(
  profile: CitizenProfile | null | undefined,
  authEmail?: string | null,
) {
  if (profile?.full_name?.trim()) return profile.full_name.trim();
  if (authEmail) return authEmail.split("@")[0];
  return "Cetățean";
}

export function formatRoDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}
