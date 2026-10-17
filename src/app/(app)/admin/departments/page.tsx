import { redirect } from "next/navigation";

// Departments are managed with their users on the users page.
export default function DepartmentsPage() {
  redirect("/admin/users");
}
