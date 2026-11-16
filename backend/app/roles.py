"""The four platform roles. Values are what is stored in users.role."""
CREATOR = "creator"
AGENCY = "agency"
MARKETING_TEAM = "marketing_team"
ADMIN = "admin"

ROLE_LABELS = {
    CREATOR: "Creator",
    AGENCY: "Agency",
    MARKETING_TEAM: "Marketing Team",
    ADMIN: "Administrator",
}
ALL_ROLES = tuple(ROLE_LABELS)

# Roles a person may pick at signup (creator and agency for public registration)
SIGNUP_ROLES = (CREATOR, AGENCY)
