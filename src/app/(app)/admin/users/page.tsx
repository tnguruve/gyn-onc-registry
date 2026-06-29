import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { roleLabel } from "@/lib/permissions";
import { createUserAction, toggleUserActiveAction } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label, FormField, FormRow } from "@/components/ui/field";

export default async function AdminUsersPage() {
  await requirePermission("admin:users");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-600">Create accounts and control access by role.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add user</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="space-y-2">
            <FormRow>
              <FormField>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" required />
              </FormField>
              <FormField>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <Label htmlFor="role">Role</Label>
                <Select id="role" name="role" required defaultValue="FRONT_DESK">
                  <option value="ADMIN">Administrator</option>
                  <option value="CLINICIAN">Clinician</option>
                  <option value="FRONT_DESK">Front Desk</option>
                  <option value="RESEARCHER">Researcher</option>
                </Select>
              </FormField>
              <FormField>
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </FormField>
            </FormRow>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked />
              Account active
            </label>
            <Button type="submit" size="sm">
              Create user
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const toggle = toggleUserActiveAction.bind(null, user.id, !user.active);
                return (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">{user.name}</td>
                    <td className="py-3 pr-4">{user.email}</td>
                    <td className="py-3 pr-4">{roleLabel(user.role)}</td>
                    <td className="py-3 pr-4">{user.active ? "Active" : "Disabled"}</td>
                    <td className="py-3">
                      <form action={toggle}>
                        <Button type="submit" size="sm" variant={user.active ? "danger" : "secondary"}>
                          {user.active ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
