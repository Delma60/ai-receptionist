// Firestore data model for custom roles
// Collection: /platform/roles/{roleId}
// Fields:
//   - name: string
//   - description: string
//   - permissions: string[]
//
// Example document:
// {
//   name: "manager",
//   description: "Can manage agents and view reports",
//   permissions: ["VIEW_AGENTS", "CREATE_AGENT", "VIEW_REPORTS"]
// }

// You will need to update your backend logic to read roles and permissions from this collection.
// Next: Scaffold backend API endpoints for CRUD operations on roles.
