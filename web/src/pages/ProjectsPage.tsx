import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Projects</h1>
        <Card>
          <CardHeader>
            <CardTitle>Projects Management</CardTitle>
            <CardDescription>Manage recruitment projects and role requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-600">Projects page coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
