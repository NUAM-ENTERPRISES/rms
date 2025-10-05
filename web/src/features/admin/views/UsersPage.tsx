import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Users</h1>
        <Card>
          <CardHeader>
            <CardTitle>Users Management</CardTitle>
            <CardDescription>Manage team members and role assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-600">Users page coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
