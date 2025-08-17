import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CandidatesPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Candidates</h1>
        <Card>
          <CardHeader>
            <CardTitle>Candidates Management</CardTitle>
            <CardDescription>Manage candidate profiles and applications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-600">Candidates page coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
